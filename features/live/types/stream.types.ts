/**
 * Live Streaming Feature Types
 * Types specific to the live streaming feature module
 */

// Friend data from /api/user/friends
export interface Friend {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isVerified: boolean;
  isOnline: boolean;
  isLive: boolean;
  liveStream: {
    id: string;
    roomName: string;
    title: string | null;
    viewerCount: number;
  } | null;
  followedAt: string;
}

// User data from /api/user/me
export interface StreamUserData {
  id: string;
  username: string | null;
  email: string | null;
  walletAddress: string | null;
  avatar: string | null;
  hasCompletedOnboarding: boolean;
}

// Camera mode for mobile
export type CameraMode = 'VIDEO' | 'PHOTO' | 'LIVE';

// Stream categories
export type StreamCategory =
  | 'gaming'
  | 'music'
  | 'irl'
  | 'creative'
  | 'talk'
  | 'sports'
  | 'education'
  | 'other';

// Stream status
export interface StreamInfo {
  id: string;
  roomName: string;
  title: string;
  category: StreamCategory | null;
  viewerCount: number;
  startedAt: string;
  isLive: boolean;
}

// Chat message from LiveKit
export interface LiveChatMessage {
  id: string;
  user: string;
  message: string;
  avatar?: string;
  tip?: number;
  timestamp: Date;
  isCreator: boolean;
}

// Activity event types
export type ActivityEventType = 'like' | 'follow' | 'tip' | 'join' | 'subscribe';

// Activity event from LiveKit
export interface LiveActivityEvent {
  id: string;
  type: ActivityEventType;
  user: string;
  avatar?: string;
  amount?: number;
  timestamp: number;
}

// Incoming invite notification
export interface IncomingInvite {
  fromUsername: string;
  fromRoomName: string;
  fromAvatar?: string;
  timestamp: number;
}

// Pending outgoing invite
export interface PendingInvite {
  toUsername: string;
  toRoomName: string;
}

// PiP position and size
export interface PipPosition {
  x: number;
  y: number;
}

export interface PipSize {
  width: number;
  height: number;
}

// Audio device info
export interface AudioDeviceOption {
  deviceId: string;
  label: string;
}

// Stream API responses
export interface StartStreamResponse {
  stream: {
    id: string;
    userId: string;
    title: string;
    category: StreamCategory | null;
    isLive: boolean;
    startedAt: string;
  };
  roomName: string;
  token: string;
}

export interface EndStreamResponse {
  success: boolean;
  stream?: {
    id: string;
    endedAt: string;
    duration: number;
  };
}

export interface LiveStreamsResponse {
  streams: StreamInfo[];
}

// Clip related types
export interface ClipData {
  blob: Blob | null;
  videoUrl: string | null;
  caption: string;
  price: string;
  postType: 'free' | 'paid';
  duration: number;
}

// Broadcast state for remote control
export interface BroadcastState {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  screenSharing: boolean;
  desktopAudioEnabled: boolean;
  isClipping: boolean;
  clipTime: number;
  isLive: boolean;
  viewerCount: number;
  sessionTime: number;
  audioDevices: AudioDeviceOption[];
  selectedAudioDevice: string;
  previewMode: boolean;
}

// Remote control commands
export type RemoteCommand =
  | 'go_live'
  | 'end_stream'
  | 'toggle_camera'
  | 'toggle_microphone'
  | 'toggle_screen_share'
  | 'start_clip'
  | 'stop_clip'
  | 'switch_audio_device';

export interface RemoteCommandMessage {
  type: 'remote_command';
  command: RemoteCommand;
  payload?: any;
}

export interface RemoteStateMessage {
  type: 'remote_state';
  state: BroadcastState;
}
