/**
 * Profile Feature Types
 * Types specific to the profile feature module
 */

export interface LiveStreamInfo {
  id: string;
  roomName: string;
  title?: string;
  viewerCount?: number;
  startedAt?: string;
}

export interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
  streams: number;
  earnings: number;
}

export interface ProfileData {
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
  createdAt?: string;
  stats: ProfileStats;
}

export interface ProfilePost {
  id: string;
  type: 'free' | 'paid' | 'locked' | 'replay';
  title: string | null;
  thumbnailUrl: string | null;
  contentUrl: string | null;
  price: number | null;
  viewerCount: number;
  createdAt: Date;
}

export interface ProfileResponse {
  profile: ProfileData;
}

export interface ProfilePostsResponse {
  posts: ProfilePost[];
}

export interface FollowStatusResponse {
  isFollowing: boolean;
}

export interface FollowResponse {
  success: boolean;
  message: string;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  subscriptionPrice?: number;
  subscriptionsEnabled?: boolean;
}

export interface UpdateProfileResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    bio: string | null;
    subscriptionPrice: number;
    subscriptionsEnabled: boolean;
  };
}

export type ProfileTab = 'posts' | 'replays' | 'liked';
