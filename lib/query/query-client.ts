import { QueryClient } from '@tanstack/react-query';

/**
 * Create a new QueryClient with Instagram-style defaults
 * - Stale time: 60s (data stays fresh for 1 minute)
 * - GC time: 5 minutes (unused data is garbage collected)
 * - Retry: 1 attempt for queries, 0 for mutations
 * - No refetch on window focus (prevents unexpected refetches)
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Query key factory helpers for consistent key patterns
export const queryKeys = {
  // Feed
  feed: {
    all: ['feed'] as const,
    list: () => [...queryKeys.feed.all, 'list'] as const,
    infinite: () => [...queryKeys.feed.all, 'infinite'] as const,
  },

  // Profile
  profile: {
    all: ['profile'] as const,
    detail: (username: string) => [...queryKeys.profile.all, username] as const,
    posts: (username: string) => [...queryKeys.profile.detail(username), 'posts'] as const,
    followers: (username: string) => [...queryKeys.profile.detail(username), 'followers'] as const,
    following: (username: string) => [...queryKeys.profile.detail(username), 'following'] as const,
    followStatus: (username: string) => [...queryKeys.profile.detail(username), 'follow-status'] as const,
    currentUser: () => [...queryKeys.profile.all, 'me'] as const,
  },

  // Friends (people current user is following)
  friends: {
    all: ['friends'] as const,
    list: () => [...queryKeys.friends.all, 'list'] as const,
  },

  // Streams
  streams: {
    all: ['streams'] as const,
    live: () => [...queryKeys.streams.all, 'live'] as const,
    detail: (roomName: string) => [...queryKeys.streams.all, 'detail', roomName] as const,
    friends: () => [...queryKeys.streams.all, 'friends'] as const,
  },

  // Rooms
  rooms: {
    all: ['rooms'] as const,
    list: () => [...queryKeys.rooms.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.rooms.all, id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
  },

  // Comments
  comments: {
    all: ['comments'] as const,
    byPost: (postId: string) => [...queryKeys.comments.all, postId] as const,
  },
};
