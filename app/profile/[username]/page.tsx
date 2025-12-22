'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Loader2, Camera, Settings, LogOut } from 'lucide-react';
import {
  ProfileAvatar,
  ProfileActions,
  ProfileStats,
  SubscriptionCard,
  ContentGrid,
  ContentTabs,
  ContentGridItem,
  CreatePostModal,
  PostDetailModal,
  EditProfileModal,
} from '@/components/profile';
import { authGet, authPost, authDelete } from '@/lib/fetch';

interface LiveStreamInfo {
  id: string;
  roomName: string;
  title?: string;
  viewerCount?: number;
  startedAt?: string;
}

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  coverImage: string | null;
  bio: string | null;
  greeting: string;
  subscriptionPrice: number;
  subscriptionsEnabled: boolean;
  isVerified: boolean;
  isOnline: boolean;
  isLive: boolean;
  liveStream: LiveStreamInfo | null;
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
  const username = params.username as string;
  const { data: session, status } = useSession();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<ContentGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ContentGridItem | null>(null);
  const [currentUserUsername, setCurrentUserUsername] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'replays' | 'liked'>('posts');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Refs to prevent race conditions
  const isMountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);
  const currentUsernameRef = useRef(username);

  // Update ref when username changes
  useEffect(() => {
    currentUsernameRef.current = username;
  }, [username]);

  // Check if viewing own profile (case-insensitive)
  const isOwnProfile = currentUserUsername === username.toLowerCase();

  // Fetch current user info
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await authGet('/api/user/me');
      if (response.ok && isMountedRef.current) {
        const data = await response.json();
        if (data.user?.username) {
          setCurrentUserUsername(data.user.username.toLowerCase());
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  }, []);

  // Fetch profile and posts
  const fetchProfile = useCallback(async () => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    const targetUsername = currentUsernameRef.current;

    try {
      setLoading(true);
      setError(null);

      // Fetch profile and posts in parallel
      const [profileRes, postsRes] = await Promise.all([
        authGet(`/api/user/profile/${targetUsername}`),
        authGet(`/api/user/profile/${targetUsername}/posts`),
      ]);

      // Check if component unmounted or username changed
      if (!isMountedRef.current || currentUsernameRef.current !== targetUsername) {
        return;
      }

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

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      if (isMountedRef.current) {
        setError('Failed to load profile');
        setLoading(false);
      }
    } finally {
      fetchInProgressRef.current = false;
    }
  }, []);

  // Check follow status
  const checkFollowStatus = useCallback(async () => {
    if (!username) return;
    try {
      const response = await authGet(`/api/user/follow?username=${encodeURIComponent(username)}`);
      if (response.ok && isMountedRef.current) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  }, [username]);

  // Initial fetch when component mounts or username changes
  useEffect(() => {
    isMountedRef.current = true;
    fetchInProgressRef.current = false;

    // Reset state when username changes
    setProfile(null);
    setPosts([]);
    setError(null);
    setLoading(true);

    // Fetch profile data regardless of session status
    // The API will handle authentication
    fetchProfile();
    fetchCurrentUser();

    return () => {
      isMountedRef.current = false;
    };
  }, [username, status, fetchProfile, fetchCurrentUser]);

  // Check follow status when session is ready
  useEffect(() => {
    if (status === 'authenticated' && session?.user && username) {
      checkFollowStatus();
    }
  }, [status, session, username, checkFollowStatus]);

  // Refetch on visibility change (mobile app resume)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && profile) {
        fetchProfile();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile, fetchProfile]);

  const handleFollow = async () => {
    if (!session?.user) return;

    const wasFollowing = isFollowing;

    // Optimistic update
    setIsFollowing(!isFollowing);
    if (profile) {
      setProfile({
        ...profile,
        stats: {
          ...profile.stats,
          followers: wasFollowing
            ? Math.max(0, profile.stats.followers - 1)
            : profile.stats.followers + 1,
        },
      });
    }

    try {
      const response = wasFollowing
        ? await authDelete('/api/user/follow', { username })
        : await authPost('/api/user/follow', { username });

      if (!response.ok) {
        // Revert on error
        setIsFollowing(wasFollowing);
        if (profile) {
          setProfile({
            ...profile,
            stats: {
              ...profile.stats,
              followers: wasFollowing
                ? profile.stats.followers + 1
                : Math.max(0, profile.stats.followers - 1),
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to update follow status:', error);
      // Revert on error
      setIsFollowing(wasFollowing);
    }
  };

  const handleTip = () => {
    console.log('Tip clicked');
  };

  const handleSubscribe = () => {
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
          posts: Math.max(0, profile.stats.posts - 1),
        },
      });
    }
  };

  const handlePostCreated = () => {
    fetchProfile();
  };

  const handleEditProfile = () => {
    setShowEditProfile(true);
  };

  // Show loading while profile is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0a15] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#0f0a15] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">{error || 'Profile not found'}</p>
          <button
            onClick={() => {
              setError(null);
              fetchProfile();
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0a15]">
      {/* Settings Icon - Top Left (only on own profile) */}
      {isOwnProfile && (
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
          >
            <Settings className="h-5 w-5 text-white" />
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSettings(false)}
              />
              <div className="absolute top-12 left-0 z-50 bg-[#1a1a1d] rounded-lg shadow-xl border border-gray-800 overflow-hidden min-w-[180px]">
                <button
                  onClick={async () => {
                    setShowSettings(false);
                    await signOut({ callbackUrl: '/' });
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-red-400 hover:bg-gray-800 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Avatar section with cover image */}
      <ProfileAvatar
        avatarUrl={profile.avatar}
        coverUrl={profile.coverImage || undefined}
        name={profile.displayName || profile.username}
        username={profile.username}
        isOnline={profile.isOnline}
        isLive={profile.isLive}
        liveStream={profile.liveStream}
        isVerified={profile.isVerified}
        isOwnProfile={isOwnProfile}
        onEditProfile={handleEditProfile}
      />

      {/* Stats */}
      <ProfileStats
        posts={profile.stats.posts}
        followers={profile.stats.followers}
        following={profile.stats.following}
        isSubscriber={false}
      />

      {/* Bio */}
      {profile.bio && (
        <div className="px-8 pb-3">
          <p className="text-gray-300 text-sm text-center">{profile.bio}</p>
        </div>
      )}

      {/* Action buttons - hide on own profile */}
      {!isOwnProfile && (
        <ProfileActions
          isFollowing={isFollowing}
          onFollow={handleFollow}
          onTip={handleTip}
        />
      )}

      {/* Subscription card - only show if enabled */}
      {profile.subscriptionsEnabled && (
        <SubscriptionCard
          price={profile.subscriptionPrice}
          onSubscribe={handleSubscribe}
        />
      )}

      {/* Content Tabs */}
      <ContentTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        postCount={profile.stats.posts}
        replayCount={0}
        likedCount={0}
      />

      {/* Content grid */}
      {activeTab === 'posts' && (
        <>
          <ContentGrid
            items={posts}
            onItemClick={handleContentClick}
            isOwnProfile={isOwnProfile}
            onAddClick={() => setShowCreatePost(true)}
          />

          {posts.length === 0 && isOwnProfile && (
            <div className="text-center py-4 px-4 -mt-4">
              <p className="text-gray-400 font-medium">No posts yet</p>
              <p className="text-gray-600 text-sm mt-1">
                Tap the camera to share your first photo
              </p>
            </div>
          )}

          {posts.length === 0 && !isOwnProfile && (
            <div className="text-center py-12 px-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                <Camera className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">No posts yet</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'replays' && (
        <div className="text-center py-12 px-4">
          <p className="text-gray-400 font-medium">No replays yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Stream replays will appear here
          </p>
        </div>
      )}

      {activeTab === 'liked' && (
        <div className="text-center py-12 px-4">
          <p className="text-gray-400 font-medium">No sparked content yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Content you spark will appear here
          </p>
        </div>
      )}

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={handlePostCreated}
      />

      <PostDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onDelete={handlePostDeleted}
        isOwnPost={isOwnProfile}
      />

      {profile && (
        <EditProfileModal
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          profile={{
            displayName: profile.displayName,
            bio: profile.bio,
            avatar: profile.avatar,
            subscriptionPrice: profile.subscriptionPrice,
            subscriptionsEnabled: profile.subscriptionsEnabled,
          }}
          onSave={fetchProfile}
        />
      )}
    </div>
  );
}
