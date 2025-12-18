'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { FeedPost, FeedPostData } from './FeedPost';
import { StoriesRow, StoryUser, UserRoom } from './StoriesRow';

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

  useEffect(() => {
    const fetchData = async () => {
      // Wait for session status to be determined (but don't block on unauthenticated)
      if (status === 'loading') {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch with credentials to ensure cookies are sent on mobile
        const fetchOptions: RequestInit = {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        };

        // Always try to fetch - let the API determine auth status
        // This works around useSession not detecting session on mobile
        const [feedRes, friendsRes, userRes, roomsRes] = await Promise.all([
          fetch('/api/feed', fetchOptions),
          fetch('/api/user/friends', fetchOptions),
          fetch('/api/user/me', fetchOptions),
          fetch('/api/rooms', fetchOptions),
        ]);

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
      } catch (err) {
        console.error('Error fetching feed data:', err);
        setError('Failed to load feed');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status]);

  // Show loading while session is loading
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Show loading while fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <p className="text-red-400 text-center mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Stories Row */}
      <StoriesRow
        users={friends}
        rooms={rooms}
        currentUserAvatar={currentUser?.avatar}
        onAddStoryClick={() => {
          window.location.href = '/createroom';
        }}
      />

      {/* Feed Posts */}
      {posts.length > 0 && (
        <div>
          {posts.map((post) => (
            <FeedPost key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
