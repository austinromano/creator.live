/**
 * Profile Feature Module
 * Public exports for the profile feature
 */

// API functions (rarely needed directly, use hooks instead)
export * from './api/profile.api';

// React Query hooks
export {
  useProfile,
  useProfilePosts,
  useFollowStatus,
  useFollow,
  useUpdateProfile,
  useDeletePost,
  usePrefetchProfile,
} from './api/profile.queries';

// Zustand store
export { useProfileStore } from './store/profile.store';

// Types
export type {
  ProfileData,
  ProfileStats,
  ProfilePost,
  ProfileResponse,
  ProfilePostsResponse,
  FollowStatusResponse,
  FollowResponse,
  UpdateProfileData,
  UpdateProfileResponse,
  LiveStreamInfo,
  ProfileTab,
} from './types/profile.types';
