/**
 * Post-related type definitions
 */

import type { PostAuthor } from './user';

// Post types
export type PostType = 'free' | 'paid' | 'locked' | 'replay';

// Re-export PostAuthor for convenience
export type { PostAuthor } from './user';

// Feed post - full data for feed display
export interface FeedPost {
  id: string;
  type: PostType;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  contentUrl: string | null;
  price: number | null;
  sparkCount: number;
  sparked: boolean;
  createdAt: string;
  user: PostAuthor;
}

// Profile post - for grid display
export interface ProfilePost {
  id: string;
  type: PostType;
  title: string | null;
  thumbnailUrl: string | null;
  contentUrl: string | null;
  price: number | null;
  viewerCount: number;
  createdAt: string;
}

// Post detail - full post with all data
export interface PostDetail extends FeedPost {
  viewerCount: number;
  comments: Comment[];
}

// Comment on a post
export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  starCount: number;
  starred: boolean;
  user: PostAuthor;
}

// Spark (like) data
export interface Spark {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

// API Response types
export interface FeedResponse {
  posts: FeedPost[];
}

export interface ProfilePostsResponse {
  posts: ProfilePost[];
}

export interface PostDetailResponse {
  post: PostDetail;
}

export interface CommentsResponse {
  comments: Comment[];
  hasMore: boolean;
}

export interface SparkResponse {
  success: boolean;
  sparked: boolean;
  sparkCount: number;
}

export interface CommentResponse {
  comment: Comment;
}

// Create post payload
export interface CreatePostPayload {
  type: PostType;
  title?: string;
  description?: string;
  price?: number;
}
