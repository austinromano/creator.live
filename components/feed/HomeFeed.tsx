'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { FeedPost, FeedPostData } from './FeedPost';
import { StoriesRow, StoryUser } from './StoriesRow';

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

export function HomeFeed() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [friends, setFriends] = useState<StoryUser[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch feed posts, friends, and current user in parallel
        const [feedRes, friendsRes, userRes] = await Promise.all([
          fetch('/api/feed'),
          fetch('/api/user/friends'),
          fetch('/api/user/me'),
        ]);

        if (feedRes.ok) {
          const feedData = await feedRes.json();
          setPosts(feedData.posts || []);
        }

        if (friendsRes.ok) {
          const friendsData = await friendsRes.json();
          // Transform friends data for stories row
          const storyUsers: StoryUser[] = (friendsData.friends || []).map((f: FriendData) => ({
            id: f.id,
            username: f.username,
            displayName: f.displayName,
            avatar: f.avatar,
            isLive: f.isLive,
            hasStory: false, // Can add story feature later
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
      } catch (err) {
        console.error('Error fetching feed data:', err);
        setError('Failed to load feed');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Stories Row */}
      <StoriesRow
        users={friends}
        currentUserAvatar={currentUser?.avatar}
        onAddStoryClick={() => {
          // Navigate to create post or go live
          window.location.href = '/golive';
        }}
      />

      {/* Feed Posts */}
      {posts.length > 0 ? (
        <div>
          {posts.map((post) => (
            <FeedPost key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              Welcome to your feed
            </h3>
            <p className="text-gray-400 mb-6">
              {friends.length === 0
                ? "Follow some creators to see their posts here"
                : "The people you follow haven't posted yet"}
            </p>
            <a
              href="/explore"
              className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors"
            >
              Discover Creators
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
