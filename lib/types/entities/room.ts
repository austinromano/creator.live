/**
 * Room-related type definitions
 */

import type { PostAuthor } from './user';

// Room templates
export type RoomTemplate = 'chat' | 'voice' | 'video' | 'stage';

// Room visibility
export type RoomVisibility = 'public' | 'private' | 'followers';

// Base room
export interface Room {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string | null;
  template: RoomTemplate;
  visibility: RoomVisibility;
  isActive: boolean;
  allowMemberInvites: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

// Room with owner info
export interface RoomWithOwner extends Room {
  owner: PostAuthor;
}

// Room member
export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  user: PostAuthor;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

// Room message
export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  user: PostAuthor;
  text: string;
  createdAt: string;
}

// Room for stories row (minimal)
export interface UserRoom {
  id: string;
  name: string;
  icon: string | null;
  template: RoomTemplate | null;
}

// API Response types
export interface RoomsResponse {
  rooms: Room[];
}

export interface RoomDetailResponse {
  room: RoomWithOwner;
  members: RoomMember[];
  isMember: boolean;
}

export interface CreateRoomResponse {
  room: Room;
}

export interface JoinRoomResponse {
  success: boolean;
  membership: RoomMember;
}

// Payloads
export interface CreateRoomPayload {
  name: string;
  description?: string;
  template?: RoomTemplate;
  visibility?: RoomVisibility;
}

export interface UpdateRoomPayload {
  name?: string;
  description?: string;
  icon?: string;
  visibility?: RoomVisibility;
  allowMemberInvites?: boolean;
}
