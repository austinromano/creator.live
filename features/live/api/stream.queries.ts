/**
 * Live Stream React Query Hooks
 * Provides data fetching for live streaming features
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/query-client';
import * as streamApi from './stream.api';
import type {
  LiveStreamsResponse,
  StartStreamResponse,
  EndStreamResponse,
  Friend,
  StreamCategory,
} from '../types/stream.types';

/**
 * Get all currently live streams
 * Polls every 30 seconds to keep list fresh
 */
export function useLiveStreams(
  options?: Omit<UseQueryOptions<LiveStreamsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.streams.live(),
    queryFn: streamApi.getLiveStreams,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    ...options,
  });
}

/**
 * Get friends list with live status
 * Used in golive page to see who's live and invite
 */
export function useStreamFriends(
  options?: Omit<UseQueryOptions<{ friends: Friend[] }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.friends.list(),
    queryFn: streamApi.getFriends,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Poll to catch live status changes
    ...options,
  });
}

/**
 * Start a new stream
 */
export function useStartStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      title,
      category,
    }: {
      title: string;
      category?: StreamCategory | null;
    }) => streamApi.startStream(title, category),
    onSuccess: () => {
      // Invalidate live streams list
      queryClient.invalidateQueries({ queryKey: queryKeys.streams.live() });
      // Invalidate friends (their live status may affect UI)
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.list() });
    },
  });
}

/**
 * End a stream
 */
export function useEndStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (streamId: string) => streamApi.endStream(streamId),
    onSuccess: () => {
      // Invalidate queries when stream ends
      queryClient.invalidateQueries({ queryKey: queryKeys.streams.live() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.list() });
    },
  });
}

/**
 * Clean up orphaned streams
 */
export function useCleanupStreams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: streamApi.cleanupStreams,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.streams.live() });
    },
  });
}

/**
 * Send invite to a friend
 */
export function useSendInvite() {
  return useMutation({
    mutationFn: ({
      toUsername,
      fromRoomName,
    }: {
      toUsername: string;
      fromRoomName: string;
    }) => streamApi.sendInvite(toUsername, fromRoomName),
  });
}

/**
 * Accept an incoming invite
 */
export function useAcceptInvite() {
  return useMutation({
    mutationFn: ({
      fromUsername,
      myRoomName,
    }: {
      fromUsername: string;
      myRoomName: string;
    }) => streamApi.acceptInvite(fromUsername, myRoomName),
  });
}

/**
 * Decline an incoming invite
 */
export function useDeclineInvite() {
  return useMutation({
    mutationFn: (fromUsername: string) => streamApi.declineInvite(fromUsername),
  });
}

/**
 * Upload stream thumbnail
 */
export function useUploadThumbnail() {
  return useMutation({
    mutationFn: ({
      roomName,
      thumbnailBlob,
    }: {
      roomName: string;
      thumbnailBlob: Blob;
    }) => streamApi.uploadThumbnail(roomName, thumbnailBlob),
  });
}

/**
 * Look up user by username
 */
export function useLookupUser(username: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['user', 'lookup', username],
    queryFn: () => streamApi.lookupUser(username),
    enabled: enabled && !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes - user info doesn't change often
  });
}
