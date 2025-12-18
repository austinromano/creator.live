/**
 * User-related type definitions
 */

// Base user type - minimal fields for lists and cards
export interface User {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isVerified: boolean;
}

// Author info embedded in posts/comments
export interface PostAuthor {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isVerified: boolean;
}

// Extended user for profile pages
export interface ProfileUser extends User {
  email: string | null;
  walletAddress: string | null;
  coverImage: string | null;
  bio: string | null;
  greeting: string | null;
  subscriptionPrice: number | null;
  subscriptionsEnabled: boolean;
  hasCompletedOnboarding: boolean;
  createdAt: string;
}

// Profile data with stats and stream info
export interface ProfileData {
  profile: ProfileUser;
  stats: ProfileStats;
  isFollowing: boolean;
  liveStream: LiveStreamInfo | null;
}

// Profile statistics
export interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
}

// Live stream preview info
export interface LiveStreamInfo {
  id: string;
  roomName: string;
  title: string | null;
  viewerCount: number;
  startedAt: string;
}

// User for friend/follower lists
export interface FriendUser extends User {
  isLive: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
}

// Current user (authenticated)
export interface CurrentUser {
  id: string;
  username: string | null;
  email: string | null;
  walletAddress: string | null;
  avatar: string | null;
  hasCompletedOnboarding: boolean;
  createdAt: string;
}

// API Response types
export interface ProfileResponse {
  profile: ProfileUser;
  stats: ProfileStats;
  isFollowing: boolean;
  liveStream: LiveStreamInfo | null;
}

export interface CurrentUserResponse {
  user: CurrentUser;
}

export interface FriendsResponse {
  friends: FriendUser[];
}

export interface FollowResponse {
  success: boolean;
  isFollowing: boolean;
  followerCount: number;
}
