/**
 * React Query hooks for feed feature
 * Handles caching, optimistic updates, and data synchronization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/query-client';
import * as feedApi from './feed.api';
import type { FeedResponse, FeedPost, CommentsResponse, Comment } from '@/lib/types/entities';

// ============================================================================
// Feed Queries
// ============================================================================

/**
 * Get main feed with posts from followed users + own posts
 */
export function useFeed(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.feed.list(),
    queryFn: feedApi.getFeed,
    staleTime: 30 * 1000, // 30 seconds - feed updates frequently
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get friends for stories row
 */
export function useFriends(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.friends.list(),
    queryFn: feedApi.getFriends,
    staleTime: 60 * 1000, // 1 minute
    select: (data) => data.friends,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get current user's rooms
 */
export function useRooms(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.rooms.list(),
    queryFn: feedApi.getRooms,
    staleTime: 60 * 1000,
    select: (data) => data.rooms,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get current user data
 */
export function useCurrentUser(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.profile.currentUser(),
    queryFn: feedApi.getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes - user data changes infrequently
    select: (data) => data.user,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get comments for a post
 */
export function useComments(postId: string) {
  return useQuery({
    queryKey: queryKeys.comments.byPost(postId),
    queryFn: () => feedApi.getComments(postId),
    enabled: !!postId,
    staleTime: 30 * 1000,
    select: (data) => data.comments,
  });
}

// ============================================================================
// Feed Mutations with Optimistic Updates
// ============================================================================

/**
 * Spark/unspark a post with optimistic update
 */
export function useSparkPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, sparked }: { postId: string; sparked: boolean }) => {
      if (sparked) {
        return feedApi.unsparkPost(postId);
      }
      return feedApi.sparkPost(postId);
    },

    // Optimistic update
    onMutate: async ({ postId, sparked }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.feed.list() });

      // Snapshot previous value
      const previousFeed = queryClient.getQueryData<FeedResponse>(queryKeys.feed.list());

      // Optimistically update the feed
      queryClient.setQueryData<FeedResponse>(queryKeys.feed.list(), (old) => {
        if (!old) return old;
        return {
          posts: old.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  sparked: !sparked,
                  sparkCount: sparked ? post.sparkCount - 1 : post.sparkCount + 1,
                }
              : post
          ),
        };
      });

      return { previousFeed };
    },

    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(queryKeys.feed.list(), context.previousFeed);
      }
    },

    // Refetch after mutation settles
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.list() });
    },
  });
}

/**
 * Add a comment with optimistic update
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) =>
      feedApi.addComment(postId, text),

    onSuccess: (data, { postId }) => {
      // Add the new comment to the cache
      queryClient.setQueryData<CommentsResponse>(
        queryKeys.comments.byPost(postId),
        (old) => {
          if (!old) return { comments: [data.comment], hasMore: false };
          return {
            ...old,
            comments: [data.comment, ...old.comments],
          };
        }
      );
    },

    onSettled: (_data, _error, { postId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) });
    },
  });
}

/**
 * Like/unlike a comment with optimistic update
 */
export function useLikeComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
      starred,
    }: {
      commentId: string;
      postId: string;
      starred: boolean;
    }) => {
      if (starred) {
        return feedApi.unlikeComment(commentId);
      }
      return feedApi.likeComment(commentId);
    },

    onMutate: async ({ commentId, postId, starred }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.byPost(postId) });

      const previousComments = queryClient.getQueryData<CommentsResponse>(
        queryKeys.comments.byPost(postId)
      );

      queryClient.setQueryData<CommentsResponse>(
        queryKeys.comments.byPost(postId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            comments: old.comments.map((comment) =>
              comment.id === commentId
                ? {
                    ...comment,
                    starred: !starred,
                    starCount: starred ? comment.starCount - 1 : comment.starCount + 1,
                  }
                : comment
            ),
          };
        }
      );

      return { previousComments };
    },

    onError: (_err, { postId }, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(queryKeys.comments.byPost(postId), context.previousComments);
      }
    },

    onSettled: (_data, _error, { postId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) });
    },
  });
}

// ============================================================================
// Prefetching
// ============================================================================

/**
 * Prefetch comments for a post (call on hover/interaction)
 */
export function usePrefetchComments() {
  const queryClient = useQueryClient();

  return (postId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.comments.byPost(postId),
      queryFn: () => feedApi.getComments(postId),
      staleTime: 30 * 1000,
    });
  };
}
