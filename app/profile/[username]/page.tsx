'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Camera } from 'lucide-react';
import {
  ProfileHeader,
  ProfileAvatar,
  ProfileActions,
  ProfileStats,
  SubscriptionCard,
  ContentGrid,
  ContentGridItem,
  CreatePostModal,
  PostDetailModal,
} from '@/components/profile';

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string | null;
  greeting: string;
  subscriptionPrice: number;
  isVerified: boolean;
  stats: {
    posts: number;
    followers: number;
    following: number;
    streams: number;
    earnings: number;
  };
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { data: session } = useSession();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<ContentGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ContentGridItem | null>(null);
  const [currentUserUsername, setCurrentUserUsername] = useState<string | null>(null);

  // Fetch current user's username from database
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!session?.user) return;
      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.username) {
            setCurrentUserUsername(data.user.username.toLowerCase());
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    fetchCurrentUser();
  }, [session]);

  // Check if viewing own profile (case-insensitive)
  const isOwnProfile = currentUserUsername === username.toLowerCase();

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch profile data
      const profileRes = await fetch(`/api/user/profile/${username}`);
      if (!profileRes.ok) {
        if (profileRes.status === 404) {
          setError('Profile not found');
        } else {
          setError('Failed to load profile');
        }
        setLoading(false);
        return;
      }
      const profileData = await profileRes.json();
      setProfile(profileData.profile);

      // Fetch posts
      const postsRes = await fetch(`/api/user/profile/${username}/posts`);
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username, fetchProfile]);

  const handleFollow = async () => {
    // TODO: Implement follow functionality
    setIsFollowing(!isFollowing);
    console.log('Follow clicked');
  };

  const handleTip = () => {
    // TODO: Implement tip functionality
    console.log('Tip clicked');
  };

  const handleSubscribe = () => {
    // TODO: Implement subscribe functionality
    console.log('Subscribe clicked');
  };

  const handleContentClick = (item: ContentGridItem) => {
    setSelectedPost(item);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(posts.filter(p => p.id !== postId));
    if (profile) {
      setProfile({
        ...profile,
        stats: {
          ...profile.stats,
          posts: profile.stats.posts - 1,
        },
      });
    }
  };

  const handlePostCreated = () => {
    // Refresh posts after creating a new one
    fetchProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl">{error || 'Profile not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10]">
      {/* Header */}
      <ProfileHeader />

      {/* Avatar section */}
      <ProfileAvatar
        avatarUrl={profile.avatar}
        name={profile.displayName || profile.username}
        username={profile.username}
        greeting={profile.greeting}
      />

      {/* Action buttons - hide on own profile */}
      {!isOwnProfile && (
        <ProfileActions
          isFollowing={isFollowing}
          onFollow={handleFollow}
          onTip={handleTip}
        />
      )}

      {/* Stats */}
      <ProfileStats isSubscriber={false} />

      {/* Subscription card - hide on own profile */}
      {!isOwnProfile && (
        <SubscriptionCard
          price={profile.subscriptionPrice}
          onSubscribe={handleSubscribe}
        />
      )}

      {/* Content grid */}
      <ContentGrid
        items={posts}
        onItemClick={handleContentClick}
        isOwnProfile={isOwnProfile}
        onAddClick={() => setShowCreatePost(true)}
      />

      {/* Empty state text for own profile */}
      {posts.length === 0 && isOwnProfile && (
        <div className="text-center py-4 px-4 -mt-4">
          <p className="text-gray-400 font-medium">No posts yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Tap the camera to share your first photo
          </p>
        </div>
      )}

      {/* Empty state for no posts - only show for other users viewing */}
      {posts.length === 0 && !isOwnProfile && (
        <div className="text-center py-12 px-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <Camera className="h-8 w-8 text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium">No posts yet</p>
        </div>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onDelete={handlePostDeleted}
        isOwnPost={isOwnProfile}
      />
    </div>
  );
}
