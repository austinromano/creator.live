/**
 * Profile API Functions
 * Raw API functions for the profile feature
 */

import { api } from '@/lib/api/client';
import type {
  ProfileResponse,
  ProfilePostsResponse,
  FollowStatusResponse,
  FollowResponse,
  UpdateProfileData,
  UpdateProfileResponse,
} from '../types/profile.types';

/**
 * Get a user's profile by username
 */
export async function getProfile(username: string): Promise<ProfileResponse> {
  return api.get<ProfileResponse>(`/api/user/profile/${username}`);
}

/**
 * Get a user's posts by username
 */
export async function getProfilePosts(username: string): Promise<ProfilePostsResponse> {
  return api.get<ProfilePostsResponse>(`/api/user/profile/${username}/posts`);
}

/**
 * Check if current user is following a target user
 */
export async function getFollowStatus(username: string): Promise<FollowStatusResponse> {
  return api.get<FollowStatusResponse>(`/api/user/follow?username=${encodeURIComponent(username)}`);
}

/**
 * Follow a user
 */
export async function followUser(username: string): Promise<FollowResponse> {
  return api.post<FollowResponse>('/api/user/follow', { username });
}

/**
 * Unfollow a user
 */
export async function unfollowUser(username: string): Promise<FollowResponse> {
  return api.delete<FollowResponse>('/api/user/follow', { username });
}

/**
 * Update current user's profile
 */
export async function updateProfile(data: UpdateProfileData): Promise<UpdateProfileResponse> {
  return api.patch<UpdateProfileResponse>('/api/user/profile', data);
}

/**
 * Delete a post by ID
 */
export async function deletePost(postId: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/api/posts/${postId}`);
}
