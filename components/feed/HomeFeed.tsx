'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { FeedPost, FeedPostData } from './FeedPost';
import { StoriesRow, StoryUser, UserRoom } from './StoriesRow';
import { PostSkeleton } from './PostSkeleton';
import { authGet } from '@/lib/fetch';

interface FriendData {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isLive: boolean;
  isOnline: boolean;
}

interface CurrentUser {
  id: string;
  username: string;
  avatar: string | null;
}

interface RoomData {
  id: string;
  name: string;
  icon: string | null;
  template: string | null;
}

export function HomeFeed() {
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [friends, setFriends] = useState<StoryUser[]>([]);
  const [rooms, setRooms] = useState<UserRoom[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);
  // Use ref to track ongoing fetch to prevent duplicates
  const fetchInProgressRef = useRef(false);
  // Ref for infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Refs for pull to refresh
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    // Prevent duplicate fetches
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel with credentials for mobile
      const [feedRes, friendsRes, userRes, roomsRes] = await Promise.all([
        authGet('/api/feed'),
        authGet('/api/user/friends'),
        authGet('/api/user/me'),
        authGet('/api/rooms'),
      ]);

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      if (feedRes.ok) {
        const feedData = await feedRes.json();
        setPosts(feedData.posts || []);
      }

      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        const storyUsers: StoryUser[] = (friendsData.friends || []).map((f: FriendData) => ({
          id: f.id,
          username: f.username,
          displayName: f.displayName,
          avatar: f.avatar,
          isLive: f.isLive,
          isOnline: f.isOnline,
          hasStory: false,
        }));
        setFriends(storyUsers);
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.user) {
          setCurrentUser({
            id: userData.user.id,
            username: userData.user.username,
            avatar: userData.user.avatar,
          });
        }
      }

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        const userRooms: UserRoom[] = (roomsData.rooms || []).map((r: RoomData) => ({
          id: r.id,
          name: r.name,
          icon: r.icon,
          template: r.template,
        }));
        setRooms(userRooms);
      }

      setHasFetched(true);
    } catch (err) {
      console.error('Error fetching feed data:', err);
      if (isMountedRef.current) {
        setError('Failed to load feed. Pull down to refresh.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchInProgressRef.current = false;
    }
  }, []);

  // Effect to fetch data when session is ready
  useEffect(() => {
    isMountedRef.current = true;

    // Don't fetch while session is still loading
    if (status === 'loading') {
      return;
    }

    // Fetch data regardless of session status
    // Let the API determine authentication
    // This handles cases where useSession is slow but cookies are valid
    if (!hasFetched) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [status, hasFetched, fetchData]);

  // Refetch when window regains focus (mobile app resume)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasFetched) {
        // Refetch data when coming back to the app
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasFetched, fetchData]);

  // Infinite scroll - observe sentinel element
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          // Simulate loading more posts
          setTimeout(() => {
            setPage((p) => p + 1);
            setLoadingMore(false);
            // Disable after first load for demo
            setHasMore(false);
          }, 1500);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore]);

  // Pull to refresh
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && touchStartY.current > 0) {
        const currentY = e.touches[0].clientY;
        const distance = currentY - touchStartY.current;

        if (distance > 0 && distance < 150) {
          setPullDistance(distance);
          setIsPulling(true);
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > 80) {
        fetchData();
      }
      setIsPulling(false);
      setPullDistance(0);
      touchStartY.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, fetchData]);

  // Show loading skeletons while session is loading or initial fetch
  if (status === 'loading' || (loading && !hasFetched)) {
    return (
      <div className="pb-20">
        {/* Stories Row Skeleton */}
        <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-sm border-b border-white/5 p-3">
          <div className="flex gap-3 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-14 w-14 rounded-full bg-gray-800 animate-pulse" />
                <div className="h-2 w-12 bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        {/* Post Skeletons */}
        <div>
          {[...Array(3)].map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Show error with retry button
  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <p className="text-red-400 text-center mb-4">{error}</p>
        <button
          onClick={() => {
            setHasFetched(false);
            setError(null);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pb-20 relative">

      {/* Feed Posts */}
      {posts.length > 0 && (
        <div className="px-2 py-3">
          {posts.map((post) => (
            <FeedPost key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-20"></div>
    </div>
  );
}
