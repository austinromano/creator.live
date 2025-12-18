/**
 * Stream-related type definitions
 */

import type { User, PostAuthor } from './user';

// Stream categories
export type StreamCategory = 'IRL' | 'Gaming' | 'Music';

// Base stream info
export interface Stream {
  id: string;
  userId: string;
  roomName: string;
  streamKey: string;
  title: string | null;
  category: StreamCategory | null;
  isLive: boolean;
  viewerCount: number;
  peakViewers: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

// Stream with creator info for discovery
export interface StreamWithCreator extends Stream {
  user: PostAuthor;
}

// Stream creator for cards
export interface StreamCreator {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isVerified: boolean;
  isLive: boolean;
  viewerCount: number;
}

// Chat message in stream
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  text: string;
  timestamp: number;
  isHost: boolean;
  isMod: boolean;
}

// Activity event in stream (tips, follows, etc.)
export interface ActivityEvent {
  id: string;
  type: 'tip' | 'follow' | 'join' | 'gift' | 'subscription';
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  message?: string;
  amount?: number;
  timestamp: number;
}

// Guest invite for co-streaming
export interface GuestInvite {
  id: string;
  streamId: string;
  invitedUserId: string;
  invitedUser: PostAuthor;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

// Tip data
export interface Tip {
  id: string;
  streamId: string;
  fromUserId: string;
  toUserId: string;
  amountSol: number;
  message: string | null;
  txSignature: string;
  createdAt: string;
}

// API Response types
export interface LiveStreamsResponse {
  streams: StreamWithCreator[];
}

export interface StreamDetailResponse {
  stream: Stream;
  creator: PostAuthor;
}

export interface StartStreamResponse {
  stream: Stream;
  token: string;
}

export interface EndStreamResponse {
  success: boolean;
}

export interface StreamTokenResponse {
  token: string;
}

export interface TipResponse {
  success: boolean;
  tip: Tip;
}

// Payloads
export interface StartStreamPayload {
  title?: string;
  category?: StreamCategory;
}

export interface TipPayload {
  streamId: string;
  toWallet: string;
  amountSol: number;
  txSignature: string;
  message?: string;
}
