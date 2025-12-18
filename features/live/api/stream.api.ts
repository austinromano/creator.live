/**
 * Live Stream API Functions
 * Raw API functions for the live streaming feature
 */

import { api } from '@/lib/api/client';
import type {
  StartStreamResponse,
  EndStreamResponse,
  LiveStreamsResponse,
  StreamCategory,
  Friend,
  IncomingInvite,
} from '../types/stream.types';

/**
 * Start a new live stream
 */
export async function startStream(
  title: string,
  category?: StreamCategory | null
): Promise<StartStreamResponse> {
  return api.post<StartStreamResponse>('/api/stream/start', {
    title,
    category,
  });
}

/**
 * End a live stream
 */
export async function endStream(streamId: string): Promise<EndStreamResponse> {
  return api.post<EndStreamResponse>('/api/stream/end', { streamId });
}

/**
 * Clean up any orphaned streams for the current user
 */
export async function cleanupStreams(): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>('/api/stream/cleanup');
}

/**
 * Get all currently live streams
 */
export async function getLiveStreams(): Promise<LiveStreamsResponse> {
  return api.get<LiveStreamsResponse>('/api/streams/live');
}

/**
 * Get active streams (includes recently ended)
 */
export async function getActiveStreams(): Promise<LiveStreamsResponse> {
  return api.get<LiveStreamsResponse>('/api/streams/active');
}

/**
 * Get friends list (people the user follows)
 */
export async function getFriends(): Promise<{ friends: Friend[] }> {
  return api.get<{ friends: Friend[] }>('/api/user/friends');
}

/**
 * Upload stream thumbnail
 */
export async function uploadThumbnail(
  roomName: string,
  thumbnailBlob: Blob
): Promise<{ success: boolean; url: string }> {
  const formData = new FormData();
  formData.append('thumbnail', thumbnailBlob, 'thumbnail.jpg');
  formData.append('roomName', roomName);

  const response = await fetch('/api/stream/thumbnail', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload thumbnail');
  }

  return response.json();
}

/**
 * Delete stream thumbnail
 */
export async function deleteThumbnail(roomName: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/api/stream/thumbnail?roomName=${encodeURIComponent(roomName)}`);
}

/**
 * Send stream invite to another user
 */
export async function sendInvite(
  toUsername: string,
  fromRoomName: string
): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>('/api/stream/invite', {
    toUsername,
    fromRoomName,
  });
}

/**
 * Check for incoming invites
 */
export async function checkInvites(
  username: string
): Promise<{ hasInvite: boolean; invite?: IncomingInvite }> {
  return api.get<{ hasInvite: boolean; invite?: IncomingInvite }>(
    `/api/stream/invite?username=${encodeURIComponent(username)}`
  );
}

/**
 * Accept an invite
 */
export async function acceptInvite(
  fromUsername: string,
  myRoomName: string
): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>('/api/stream/invite', {
    accept: true,
    fromUsername,
    myRoomName,
  });
}

/**
 * Decline an invite
 */
export async function declineInvite(fromUsername: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>('/api/stream/invite', {
    fromUsername,
  });
}

/**
 * Get LiveKit token for a room
 */
export async function getLiveKitToken(
  roomName: string,
  username: string,
  isHost: boolean = false
): Promise<{ token: string }> {
  const params = new URLSearchParams({
    roomName,
    username,
    isHost: isHost.toString(),
  });
  return api.get<{ token: string }>(`/api/livekit/token?${params}`);
}

/**
 * Look up user info by username
 */
export async function lookupUser(
  username: string
): Promise<{ user: { id: string; username: string; avatar: string | null } | null }> {
  return api.get<{
    user: { id: string; username: string; avatar: string | null } | null;
  }>(`/api/user/lookup?username=${encodeURIComponent(username)}`);
}
