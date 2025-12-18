/**
 * Notification-related type definitions
 */

import type { PostAuthor } from './user';

// Notification types
export type NotificationType =
  | 'follow'
  | 'spark'
  | 'comment'
  | 'mention'
  | 'tip'
  | 'stream_live'
  | 'stream_invite'
  | 'room_invite'
  | 'subscription';

// Base notification
export interface Notification {
  id: string;
  userId: string;
  fromUserId: string | null;
  type: NotificationType;
  postId: string | null;
  roomId: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

// Notification with sender info
export interface NotificationWithSender extends Notification {
  fromUser: PostAuthor | null;
  post?: {
    id: string;
    title: string | null;
    thumbnailUrl: string | null;
  } | null;
  room?: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
}

// API Response types
export interface NotificationsResponse {
  notifications: NotificationWithSender[];
  unreadCount: number;
  hasMore: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkReadResponse {
  success: boolean;
}
