/**
 * Profile React Query Hooks
 * Provides data fetching with caching, optimistic updates, and auto-invalidation
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/query-client';
import * as profileApi from './profile.api';
import type {
  ProfileResponse,
  ProfilePostsResponse,
  FollowStatusResponse,
  UpdateProfileData,
  ProfileData,
} from '../types/profile.types';

/**
 * Get a user's profile by username
 * Uses 60s staleTime for balance between freshness and caching
 */
export function useProfile(
  username: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.profile.detail(username),
    queryFn: () => profileApi.getProfile(username),
    enabled: !!username && (options?.enabled ?? true),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get a user's posts by username
 */
export function useProfilePosts(
  username: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.profile.posts(username),
    queryFn: () => profileApi.getProfilePosts(username),
    enabled: !!username && (options?.enabled ?? true),
    staleTime: 30 * 1000, // 30 seconds - posts may update more frequently
  });
}

/**
 * Check if current user is following a target user
 */
export function useFollowStatus(
  username: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.profile.followStatus(username),
    queryFn: () => profileApi.getFollowStatus(username),
    enabled: !!username && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

/**
 * Follow/Unfollow mutation with optimistic updates
 * Updates both follow status and follower count instantly
 */
export function useFollow(username: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ isFollowing }: { isFollowing: boolean }) => {
      return isFollowing
        ? profileApi.unfollowUser(username)
        : profileApi.followUser(username);
    },
    onMutate: async ({ isFollowing }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.profile.followStatus(username),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.profile.detail(username),
      });

      // Snapshot previous values
      const previousFollowStatus = queryClient.getQueryData<FollowStatusResponse>(
        queryKeys.profile.followStatus(username)
      );
      const previousProfile = queryClient.getQueryData<ProfileResponse>(
        queryKeys.profile.detail(username)
      );

      // Optimistic update: follow status
      queryClient.setQueryData<FollowStatusResponse>(
        queryKeys.profile.followStatus(username),
        { isFollowing: !isFollowing }
      );

      // Optimistic update: follower count
      if (previousProfile) {
        queryClient.setQueryData<ProfileResponse>(
          queryKeys.profile.detail(username),
          {
            profile: {
              ...previousProfile.profile,
              stats: {
                ...previousProfile.profile.stats,
                followers: previousProfile.profile.stats.followers + (isFollowing ? -1 : 1),
              },
            },
          }
        );
      }

      return { previousFollowStatus, previousProfile };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousFollowStatus) {
        queryClient.setQueryData(
          queryKeys.profile.followStatus(username),
          context.previousFollowStatus
        );
      }
      if (context?.previousProfile) {
        queryClient.setQueryData(
          queryKeys.profile.detail(username),
          context.previousProfile
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.followStatus(username),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.detail(username),
      });
      // Also invalidate friends list (used in feed stories)
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.list(),
      });
    },
  });
}

/**
 * Update current user's profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileData) => profileApi.updateProfile(data),
    onSuccess: (response, _variables) => {
      // Invalidate current user queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.currentUser(),
      });
      // If username is known, invalidate their profile too
      if (response.user.username) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.profile.detail(response.user.username),
        });
      }
    },
  });
}

/**
 * Delete a post
 */
export function useDeletePost(username: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => profileApi.deletePost(postId),
    onMutate: async (postId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.profile.posts(username),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.profile.detail(username),
      });

      // Snapshot previous values
      const previousPosts = queryClient.getQueryData<ProfilePostsResponse>(
        queryKeys.profile.posts(username)
      );
      const previousProfile = queryClient.getQueryData<ProfileResponse>(
        queryKeys.profile.detail(username)
      );

      // Optimistic update: remove post from list
      if (previousPosts) {
        queryClient.setQueryData<ProfilePostsResponse>(
          queryKeys.profile.posts(username),
          {
            posts: previousPosts.posts.filter((post) => post.id !== postId),
          }
        );
      }

      // Optimistic update: decrement post count
      if (previousProfile) {
        queryClient.setQueryData<ProfileResponse>(
          queryKeys.profile.detail(username),
          {
            profile: {
              ...previousProfile.profile,
              stats: {
                ...previousProfile.profile.stats,
                posts: Math.max(0, previousProfile.profile.stats.posts - 1),
              },
            },
          }
        );
      }

      return { previousPosts, previousProfile };
    },
    onError: (_err, _postId, context) => {
      // Rollback on error
      if (context?.previousPosts) {
        queryClient.setQueryData(
          queryKeys.profile.posts(username),
          context.previousPosts
        );
      }
      if (context?.previousProfile) {
        queryClient.setQueryData(
          queryKeys.profile.detail(username),
          context.previousProfile
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.posts(username),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.detail(username),
      });
      // Also invalidate feed since post was deleted
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed.list(),
      });
    },
  });
}

/**
 * Prefetch a profile (for hover states, link prefetching)
 */
export function usePrefetchProfile() {
  const queryClient = useQueryClient();

  return (username: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile.detail(username),
      queryFn: () => profileApi.getProfile(username),
      staleTime: 60 * 1000,
    });
  };
}
