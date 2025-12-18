/**
 * Broadcast Store (Zustand)
 * Centralized state for live broadcast management
 */

import { create } from 'zustand';
import type {
  CameraMode,
  StreamCategory,
  AudioDeviceOption,
  PipPosition,
  PipSize,
  IncomingInvite,
  PendingInvite,
} from '../types/stream.types';

interface BroadcastState {
  // Stream state
  isLive: boolean;
  streamId: string | null;
  roomName: string | null;
  streamTitle: string;
  streamCategory: StreamCategory | null;
  sessionTime: number;
  viewerCount: number;
  followerCount: number;

  // Device state
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  screenSharing: boolean;
  desktopAudioEnabled: boolean;
  audioDevices: AudioDeviceOption[];
  selectedAudioDevice: string;

  // Camera mode (mobile)
  cameraMode: CameraMode;

  // Stream readiness
  streamReady: boolean;
  previewRoomConnected: boolean;

  // PiP state (for screen share)
  pipPosition: PipPosition;
  pipSize: PipSize;
  pipControlsVisible: boolean;

  // Guest PiP state
  guestActive: boolean;
  guestUsername: string | null;
  guestRoomName: string | null;
  guestPipPosition: PipPosition;
  guestPipSize: PipSize;
  guestPipControlsVisible: boolean;
  guestAudioMuted: boolean;

  // Clipping state
  isClipping: boolean;
  clipTime: number;
  showClipModal: boolean;

  // Invite state
  incomingInvite: IncomingInvite | null;
  pendingInvite: PendingInvite | null;

  // Actions
  setIsLive: (isLive: boolean) => void;
  setStreamId: (id: string | null) => void;
  setRoomName: (name: string | null) => void;
  setStreamTitle: (title: string) => void;
  setStreamCategory: (category: StreamCategory | null) => void;
  incrementSessionTime: () => void;
  resetSessionTime: () => void;
  setViewerCount: (count: number) => void;
  setFollowerCount: (count: number) => void;

  // Device actions
  setCameraEnabled: (enabled: boolean) => void;
  setMicrophoneEnabled: (enabled: boolean) => void;
  setScreenSharing: (sharing: boolean) => void;
  setDesktopAudioEnabled: (enabled: boolean) => void;
  setAudioDevices: (devices: AudioDeviceOption[]) => void;
  setSelectedAudioDevice: (deviceId: string) => void;

  // Camera mode
  setCameraMode: (mode: CameraMode) => void;

  // Stream readiness
  setStreamReady: (ready: boolean) => void;
  setPreviewRoomConnected: (connected: boolean) => void;

  // PiP actions
  setPipPosition: (position: PipPosition) => void;
  setPipSize: (size: PipSize) => void;
  setPipControlsVisible: (visible: boolean) => void;

  // Guest PiP actions
  setGuestActive: (active: boolean) => void;
  setGuestUsername: (username: string | null) => void;
  setGuestRoomName: (roomName: string | null) => void;
  setGuestPipPosition: (position: PipPosition) => void;
  setGuestPipSize: (size: PipSize) => void;
  setGuestPipControlsVisible: (visible: boolean) => void;
  setGuestAudioMuted: (muted: boolean) => void;

  // Clipping actions
  setIsClipping: (clipping: boolean) => void;
  setClipTime: (time: number) => void;
  incrementClipTime: () => void;
  setShowClipModal: (show: boolean) => void;

  // Invite actions
  setIncomingInvite: (invite: IncomingInvite | null) => void;
  setPendingInvite: (invite: PendingInvite | null) => void;

  // Reset all state (when ending stream)
  resetBroadcast: () => void;
}

const initialState = {
  // Stream state
  isLive: false,
  streamId: null,
  roomName: null,
  streamTitle: '',
  streamCategory: null,
  sessionTime: 0,
  viewerCount: 0,
  followerCount: 0,

  // Device state
  cameraEnabled: true,
  microphoneEnabled: true,
  screenSharing: false,
  desktopAudioEnabled: true,
  audioDevices: [],
  selectedAudioDevice: '',

  // Camera mode
  cameraMode: 'PHOTO' as CameraMode,

  // Stream readiness
  streamReady: false,
  previewRoomConnected: false,

  // PiP state - top-right default (for 1080p canvas)
  pipPosition: { x: 1440, y: 30 },
  pipSize: { width: 450, height: 338 },
  pipControlsVisible: true,

  // Guest PiP state - top-left default
  guestActive: false,
  guestUsername: null,
  guestRoomName: null,
  guestPipPosition: { x: 30, y: 30 },
  guestPipSize: { width: 253, height: 450 }, // portrait 9:16
  guestPipControlsVisible: true,
  guestAudioMuted: false,

  // Clipping state
  isClipping: false,
  clipTime: 0,
  showClipModal: false,

  // Invite state
  incomingInvite: null,
  pendingInvite: null,
};

export const useBroadcastStore = create<BroadcastState>((set) => ({
  ...initialState,

  // Stream actions
  setIsLive: (isLive) => set({ isLive }),
  setStreamId: (streamId) => set({ streamId }),
  setRoomName: (roomName) => set({ roomName }),
  setStreamTitle: (streamTitle) => set({ streamTitle }),
  setStreamCategory: (streamCategory) => set({ streamCategory }),
  incrementSessionTime: () => set((state) => ({ sessionTime: state.sessionTime + 1 })),
  resetSessionTime: () => set({ sessionTime: 0 }),
  setViewerCount: (viewerCount) => set({ viewerCount }),
  setFollowerCount: (followerCount) => set({ followerCount }),

  // Device actions
  setCameraEnabled: (cameraEnabled) => set({ cameraEnabled }),
  setMicrophoneEnabled: (microphoneEnabled) => set({ microphoneEnabled }),
  setScreenSharing: (screenSharing) => set({ screenSharing }),
  setDesktopAudioEnabled: (desktopAudioEnabled) => set({ desktopAudioEnabled }),
  setAudioDevices: (audioDevices) => set({ audioDevices }),
  setSelectedAudioDevice: (selectedAudioDevice) => set({ selectedAudioDevice }),

  // Camera mode
  setCameraMode: (cameraMode) => set({ cameraMode }),

  // Stream readiness
  setStreamReady: (streamReady) => set({ streamReady }),
  setPreviewRoomConnected: (previewRoomConnected) => set({ previewRoomConnected }),

  // PiP actions
  setPipPosition: (pipPosition) => set({ pipPosition }),
  setPipSize: (pipSize) => set({ pipSize }),
  setPipControlsVisible: (pipControlsVisible) => set({ pipControlsVisible }),

  // Guest PiP actions
  setGuestActive: (guestActive) => set({ guestActive }),
  setGuestUsername: (guestUsername) => set({ guestUsername }),
  setGuestRoomName: (guestRoomName) => set({ guestRoomName }),
  setGuestPipPosition: (guestPipPosition) => set({ guestPipPosition }),
  setGuestPipSize: (guestPipSize) => set({ guestPipSize }),
  setGuestPipControlsVisible: (guestPipControlsVisible) => set({ guestPipControlsVisible }),
  setGuestAudioMuted: (guestAudioMuted) => set({ guestAudioMuted }),

  // Clipping actions
  setIsClipping: (isClipping) => set({ isClipping }),
  setClipTime: (clipTime) => set({ clipTime }),
  incrementClipTime: () => set((state) => ({ clipTime: state.clipTime + 1 })),
  setShowClipModal: (showClipModal) => set({ showClipModal }),

  // Invite actions
  setIncomingInvite: (incomingInvite) => set({ incomingInvite }),
  setPendingInvite: (pendingInvite) => set({ pendingInvite }),

  // Reset all
  resetBroadcast: () => set(initialState),
}));
