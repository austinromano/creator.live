/**
 * Central type exports
 * Import types from here: import { User, Post, Stream } from '@/lib/types/entities'
 */

// User types
export type {
  User,
  PostAuthor,
  ProfileUser,
  ProfileData,
  ProfileStats,
  LiveStreamInfo,
  FriendUser,
  CurrentUser,
  ProfileResponse,
  CurrentUserResponse,
  FriendsResponse,
  FollowResponse,
} from './user';

// Post types
export type {
  PostType,
  FeedPost,
  ProfilePost,
  PostDetail,
  Comment,
  Spark,
  FeedResponse,
  ProfilePostsResponse,
  PostDetailResponse,
  CommentsResponse,
  SparkResponse,
  CommentResponse,
  CreatePostPayload,
} from './post';

// Stream types
export type {
  StreamCategory,
  Stream,
  StreamWithCreator,
  StreamCreator,
  ChatMessage,
  ActivityEvent,
  GuestInvite,
  Tip,
  LiveStreamsResponse,
  StreamDetailResponse,
  StartStreamResponse,
  EndStreamResponse,
  StreamTokenResponse,
  TipResponse,
  StartStreamPayload,
  TipPayload,
} from './stream';

// Room types
export type {
  RoomTemplate,
  RoomVisibility,
  Room,
  RoomWithOwner,
  RoomMember,
  RoomMessage,
  UserRoom,
  RoomsResponse,
  RoomDetailResponse,
  CreateRoomResponse,
  JoinRoomResponse,
  CreateRoomPayload,
  UpdateRoomPayload,
} from './room';

// Notification types
export type {
  NotificationType,
  Notification,
  NotificationWithSender,
  NotificationsResponse,
  UnreadCountResponse,
  MarkReadResponse,
} from './notification';
