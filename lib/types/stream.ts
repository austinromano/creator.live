/**
 * Consolidated stream-related types
 * Single source of truth for all stream data structures
 */

// Base user info that appears in stream contexts
export interface StreamUser {
  id: string;
  username: string | null;
  displayName?: string | null;
  avatar: string | null;
  walletAddress?: string | null;
  isOnline?: boolean;
  isAI?: boolean;
}

// Core stream data from database
export interface Stream {
  id: string;
  roomName: string;
  title: string;
  category: string | null;
  isLive: boolean;
  viewerCount: number;
  startedAt: string | null;
  thumbnail?: string | null;
  user: StreamUser;
}

// Props for stream card components
export interface StreamCardProps {
  stream: Stream;
  variant?: 'desktop' | 'mobile';
  size?: 'xlarge' | 'large' | 'medium' | 'small' | 'xsmall';
  showCategory?: boolean;
  connectOnHover?: boolean;
}

// LiveKit connection options
export interface StreamConnectionOptions {
  muteAudio?: boolean;
  autoConnect?: boolean;
  connectOnHover?: boolean;
}

// Stream connection state (returned by useStreamConnection hook)
export interface StreamConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  videoRef: React.RefObject<HTMLVideoElement>;
}

// API response types
export interface LiveStreamsResponse {
  streams: Stream[];
}

export interface StartStreamResponse {
  success: boolean;
  stream: {
    id: string;
    streamKey: string;
    title: string;
    isLive: boolean;
    startedAt: string;
  };
  roomName: string;
}

// Stream categories
export const STREAM_CATEGORIES = ['IRL', 'Gaming', 'Music'] as const;
export type StreamCategory = typeof STREAM_CATEGORIES[number];
