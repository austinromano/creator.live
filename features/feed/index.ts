/**
 * Feed Feature Module
 * Public exports for the feed feature
 */

// API functions (rarely needed directly, use hooks instead)
export * from './api/feed.api';

// React Query hooks
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
} from './api/feed.queries';

// Components will be added here as we migrate them
// export { HomeFeed } from './components/HomeFeed';
// export { FeedPost } from './components/FeedPost';
// export { FeedPostSkeleton } from './components/FeedPostSkeleton';
