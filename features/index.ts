/**
 * Features Index
 * Re-exports all feature modules for convenient imports
 *
 * Usage:
 * import { useFeed, useProfile, useBroadcastStore } from '@/features';
 */

// Feed feature
export {
  useFeed,
  useFriends,
  useRooms,
  useCurrentUser,
  useComments,
  useSparkPost,
  useAddComment,
  useLikeComment,
  usePrefetchComments,
} from './feed';

// Profile feature
export {
  useProfile,
  useProfilePosts,
  useFollowStatus,
  useFollow,
  useUpdateProfile,
  useDeletePost,
  usePrefetchProfile,
  useProfileStore,
} from './profile';

// Live feature
export {
  useLiveStreams,
  useStreamFriends,
  useStartStream,
  useEndStream,
  useCleanupStreams,
  useSendInvite,
  useAcceptInvite,
  useDeclineInvite,
  useUploadThumbnail,
  useLookupUser,
  useBroadcastStore,
  useChatStore,
} from './live';

// Re-export types
export type {
  // Profile types
  ProfileData,
  ProfileStats,
  ProfilePost,
  ProfileTab,
} from './profile';

export type {
  // Live types
  Friend,
  StreamCategory,
  StreamInfo,
  LiveChatMessage,
  LiveActivityEvent,
  CameraMode,
  BroadcastState,
} from './live';
