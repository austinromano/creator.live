/**
 * Live Feature Module
 * Public exports for the live streaming feature
 */

// API functions (rarely needed directly, use hooks instead)
export * from './api/stream.api';

// React Query hooks
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
} from './api/stream.queries';

// Zustand stores
export { useBroadcastStore } from './store/broadcast.store';
export { useChatStore } from './store/chat.store';

// Types
export type {
  Friend,
  StreamUserData,
  CameraMode,
  StreamCategory,
  StreamInfo,
  LiveChatMessage,
  LiveActivityEvent,
  ActivityEventType,
  IncomingInvite,
  PendingInvite,
  PipPosition,
  PipSize,
  AudioDeviceOption,
  StartStreamResponse,
  EndStreamResponse,
  LiveStreamsResponse,
  ClipData,
  BroadcastState,
  RemoteCommand,
  RemoteCommandMessage,
  RemoteStateMessage,
} from './types/stream.types';
