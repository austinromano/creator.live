'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { FeedPost, FeedPostData } from './FeedPost';
import { StoriesRow, StoryUser, UserRoom } from './StoriesRow';
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

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);
  // Use ref to track ongoing fetch to prevent duplicates
  const fetchInProgressRef = useRef(false);
  // Auto-scroll state
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

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

  // Auto-scroll effect - very slow continuous scroll
  useEffect(() => {
    let animationFrame: number;
    let lastTime = Date.now();
    let resumeTimeout: NodeJS.Timeout;

    const scroll = () => {
      if (isAutoScrolling) {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        // Scroll down smoothly - 0.02 pixels per millisecond (20 pixels per second)
        window.scrollBy({
          top: 0.02 * deltaTime,
          behavior: 'auto'
        });
      }

      animationFrame = requestAnimationFrame(scroll);
    };

    animationFrame = requestAnimationFrame(scroll);

    // Pause when finger touches screen
    const handleTouchStart = () => {
      setIsAutoScrolling(false);
      clearTimeout(resumeTimeout);
    };

    // Resume 3 seconds after finger is lifted
    const handleTouchEnd = () => {
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => setIsAutoScrolling(true), 3000);
    };

    // Pause on wheel scroll
    const handleWheel = () => {
      setIsAutoScrolling(false);
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => setIsAutoScrolling(true), 3000);
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('wheel', handleWheel);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('wheel', handleWheel);
      clearTimeout(resumeTimeout);
    };
  }, [isAutoScrolling]);

  // Show loading spinner while session is loading or initial fetch
  if (status === 'loading' || (loading && !hasFetched)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
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
    <div className="pb-20">
      {/* Stories Row - sticky with background */}
      <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-sm border-b border-white/5">
        <StoriesRow
          users={friends}
          rooms={rooms}
          currentUserAvatar={currentUser?.avatar}
          onAddStoryClick={() => {
            window.location.href = '/createroom';
          }}
        />
      </div>

      {/* Feed Posts */}
      {posts.length > 0 && (
        <div>
          {posts.map((post) => (
            <FeedPost key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Show subtle loading indicator when refreshing */}
      {loading && hasFetched && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-purple-500/50" />
        </div>
      )}
    </div>
  );
}
