/**
 * Feed API functions
 * These are the raw API calls used by React Query hooks
 */

import { api } from '@/lib/api/client';
import type {
  FeedResponse,
  SparkResponse,
  CommentsResponse,
  CommentResponse,
  FriendsResponse,
  RoomsResponse,
  CurrentUserResponse,
} from '@/lib/types/entities';

/**
 * Get the main feed - posts from followed users + own posts
 */
export async function getFeed(): Promise<FeedResponse> {
  return api.get<FeedResponse>('/api/feed');
}

/**
 * Spark (like) a post
 */
export async function sparkPost(postId: string): Promise<SparkResponse> {
  return api.post<SparkResponse>('/api/sparks', { postId });
}

/**
 * Unspark (unlike) a post
 */
export async function unsparkPost(postId: string): Promise<SparkResponse> {
  return api.delete<SparkResponse>('/api/sparks', { postId });
}

/**
 * Get comments for a post
 */
export async function getComments(postId: string): Promise<CommentsResponse> {
  return api.get<CommentsResponse>(`/api/comments?postId=${postId}`);
}

/**
 * Add a comment to a post
 */
export async function addComment(
  postId: string,
  text: string
): Promise<CommentResponse> {
  return api.post<CommentResponse>('/api/comments', { postId, text });
}

/**
 * Like a comment
 */
export async function likeComment(commentId: string): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>('/api/comments/like', { commentId });
}

/**
 * Unlike a comment
 */
export async function unlikeComment(commentId: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>('/api/comments/like', { commentId });
}

/**
 * Get user's friends (for stories row)
 */
export async function getFriends(): Promise<FriendsResponse> {
  return api.get<FriendsResponse>('/api/user/friends');
}

/**
 * Get user's rooms (for stories row)
 */
export async function getRooms(): Promise<RoomsResponse> {
  return api.get<RoomsResponse>('/api/rooms');
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return api.get<CurrentUserResponse>('/api/user/me');
}
