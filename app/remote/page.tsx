'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  Scissors,
  CircleDot,
  Send,
  Users,
  Activity,
  MessageSquare,
  Loader2,
  Wifi,
  WifiOff,
  UserPlus,
  Heart,
  Zap,
  X,
  DollarSign,
  Lock,
  Globe,
  Radio,
} from 'lucide-react';
import { Room, RoomEvent } from 'livekit-client';
import { LiveKitChatMessage, LiveKitActivityEvent } from '@/lib/livekit-stream';
import { ChatMessage } from '@/lib/types';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuthStore } from '@/stores/authStore';

interface Friend {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isVerified: boolean;
}

interface AudioDeviceInfo {
  deviceId: string;
  label: string;
}

interface RemoteState {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  screenSharing: boolean;
  desktopAudioEnabled: boolean;
  isClipping: boolean;
  clipTime: number;
  isLive: boolean;
  viewerCount: number;
  sessionTime: number;
  audioDevices: AudioDeviceInfo[];
  selectedAudioDevice: string;
}

function RemoteContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = session?.user;
  const { setShowAuthModal } = useAuthStore();

  // Connection state
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [audioMuted, setAudioMuted] = useState(true);
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);
  const connectionStateRef = useRef<'idle' | 'connecting' | 'connected'>('idle');

  // Remote state (synced from desktop)
  const [remoteState, setRemoteState] = useState<RemoteState>({
    cameraEnabled: true,
    microphoneEnabled: true,
    screenSharing: false,
    desktopAudioEnabled: true,
    isClipping: false,
    clipTime: 0,
    isLive: false,
    viewerCount: 0,
    sessionTime: 0,
    audioDevices: [],
    selectedAudioDevice: '',
  });

  // Local state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activityEvents, setActivityEvents] = useState<LiveKitActivityEvent[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'activity' | 'friends'>('chat');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [userData, setUserData] = useState<any>(null);

  // Clip state comes from desktop via remoteState (no local recording anymore)
  // Recording happens on desktop for better quality
  // Clip modal state (shown when desktop sends clip_ready)
  const [showClipModal, setShowClipModal] = useState(false);
  const [clipLocalUrl, setClipLocalUrl] = useState<string | null>(null);     // Local blob URL for instant preview
  const [clipMediaUrl, setClipMediaUrl] = useState<string | null>(null);     // Server URL after upload
  const [clipThumbnailUrl, setClipThumbnailUrl] = useState<string | null>(null);
  const [clipUploading, setClipUploading] = useState(false);                 // Upload in progress
  const [clipUploadError, setClipUploadError] = useState<string | null>(null);
  const [clipFileSize, setClipFileSize] = useState<number>(0);               // File size in MB
  const [clipCaption, setClipCaption] = useState('');
  const [clipPrice, setClipPrice] = useState('');
  const [clipPostType, setClipPostType] = useState<'free' | 'paid'>('free');
  const [isPostingClip, setIsPostingClip] = useState(false);

  // Toast notification state (non-blocking, mobile-friendly)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const username = user?.name || 'Creator';
  const roomFromUrl = searchParams.get('room');

  // Redirect to home if not authenticated and no room in URL
  useEffect(() => {
    if (status === 'unauthenticated' && !roomFromUrl) {
      router.push('/');
    }
  }, [status, roomFromUrl, router]);

  // Fetch user data
  useEffect(() => {
    if (status === 'authenticated' && user) {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUserData(data.user);
          }
        })
        .catch(err => console.error('Error fetching user profile:', err));
    }
  }, [status, user]);

  // Fetch friends
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch('/api/user/friends');
        if (response.ok) {
          const data = await response.json();
          setFriends(data.friends || []);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setFriendsLoading(false);
      }
    };

    fetchFriends();
    const interval = setInterval(fetchFriends, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get room from URL params (for unauthenticated access)
  const roomFromParams = searchParams.get('room');
  const connectionAttemptedRef = useRef(false);

  // Connect directly if room is provided in URL
  // Connect immediately - don't wait for auth status as it can cause issues with wallet auth
  useEffect(() => {
    if (roomFromParams && !connectionAttemptedRef.current && connectionStateRef.current === 'idle') {
      console.log('[Remote] Room provided in URL, connecting immediately:', roomFromParams);
      connectionAttemptedRef.current = true;
      setStreamActive(true);
      // Use a stable identity that doesn't depend on auth state
      connectToStream(roomFromParams);
    }
  }, [roomFromParams]);

  // Check if user has an active stream (only if no room in URL and user is authenticated)
  useEffect(() => {
    if (roomFromParams) return; // Skip if room is in URL

    const checkStream = async () => {
      console.log('[Remote] Checking for active stream, userData:', userData?.username);
      if (!userData?.username) {
        console.log('[Remote] No username available yet');
        return;
      }

      try {
        console.log('[Remote] Fetching /api/streams/active');
        const response = await fetch(`/api/streams/active?username=${userData.username}`);
        console.log('[Remote] Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('[Remote] API response:', data);
          if (data.stream) {
            console.log('[Remote] Found active stream:', data.stream.roomName);
            setStreamActive(true);
            connectToStream(data.stream.roomName);
          } else {
            console.log('[Remote] No active stream in response');
          }
        } else {
          console.log('[Remote] Response not OK:', response.status);
        }
      } catch (error) {
        console.error('[Remote] Error checking stream:', error);
      }
    };

    if (userData?.username) {
      checkStream();
      const interval = setInterval(checkStream, 10000);
      return () => clearInterval(interval);
    }
  }, [userData?.username, roomFromParams]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      connectionStateRef.current = 'idle';
    };
  }, []);

  // Re-attach tracks to video element when auth status changes (after sign-in)
  // This fixes the issue where video disappears after signing in
  useEffect(() => {
    if (connected && roomRef.current && videoRef.current) {
      // Small delay to let the DOM settle after re-render
      const timeoutId = setTimeout(() => {
        if (!roomRef.current || !videoRef.current) return;

        console.log('[Remote] Re-checking track attachments after status change:', status);
        // Check all remote participants for existing tracks
        roomRef.current.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.track && publication.isSubscribed) {
              const track = publication.track;
              if (track.kind === 'video') {
                console.log('[Remote] Re-attaching video track');
                track.attach(videoRef.current!);
                videoRef.current!.muted = true;
                videoRef.current!.play().catch(err =>
                  console.error('[Remote] Failed to play re-attached video:', err)
                );
                setVideoLoaded(true);
              } else if (track.kind === 'audio') {
                console.log('[Remote] Re-attaching audio track');
                track.attach(videoRef.current!);
              }
            }
          });
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [status, connected]);

  // Generate a stable remote identity that persists across auth changes
  const remoteIdentityRef = useRef<string | null>(null);
  if (!remoteIdentityRef.current) {
    remoteIdentityRef.current = `remote_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // Connect to stream for remote control
  const connectToStream = async (roomName: string) => {
    console.log('[Remote] connectToStream called with roomName:', roomName);
    console.log('[Remote] Current state ref:', connectionStateRef.current);

    // Use ref to prevent stale closure issues with interval callbacks
    if (connectionStateRef.current !== 'idle') {
      console.log('[Remote] Already connecting or connected, skipping');
      return;
    }

    connectionStateRef.current = 'connecting';
    setConnecting(true);
    console.log('[Remote] Starting connection to room:', roomName);
    try {
      // Get token for remote control (viewer with data channel access)
      // Use a stable identity that doesn't change across auth state changes
      const remoteIdentity = remoteIdentityRef.current!;
      console.log('[Remote] Using identity:', remoteIdentity);

      const tokenResponse = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          identity: remoteIdentity,
          isPublisher: false,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get token');
      }

      const { token } = await tokenResponse.json();

      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (!livekitUrl) {
        throw new Error('NEXT_PUBLIC_LIVEKIT_URL not configured');
      }

      // Create room and connect directly
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;
      setCurrentRoomName(roomName);

      // Handle video/audio track subscriptions
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log(`[Remote] Subscribed to track: ${track.kind} source: ${publication.source} from ${participant.identity}`);

        if (track.kind === 'video' && videoRef.current) {
          // Attach the new track - LiveKit handles replacing the old one
          track.attach(videoRef.current);
          setVideoLoaded(true);

          // Start muted for autoplay, user can unmute
          videoRef.current.muted = true;
          videoRef.current.play()
            .then(() => console.log('[Remote] Video playback started'))
            .catch(err => console.error('[Remote] Failed to play video:', err));
        } else if (track.kind === 'audio' && videoRef.current) {
          // Attach audio but keep video muted (user can unmute)
          track.attach(videoRef.current);
          console.log(`[Remote] Attached audio track: ${publication.trackName || 'unknown'}`);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication) => {
        console.log(`[Remote] Unsubscribed from track: ${track.kind} source: ${publication.source}`);
        // Don't detach or set videoLoaded to false - the new track will replace it automatically
      });

      // Set up data channel listener for messages
      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant) => {
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));

          if (message.type === 'remote_state') {
            setRemoteState(message.state);
          } else if (message.type === 'chat') {
            const msg = message.payload as LiveKitChatMessage;
            const chatMessage: ChatMessage = {
              id: msg.id,
              user: msg.user,
              message: msg.message,
              avatar: msg.avatar,
              tip: msg.tip,
              timestamp: new Date(msg.timestamp),
              isCreator: msg.isCreator,
            };
            setChatMessages(prev => [...prev, chatMessage]);
          } else if (message.type === 'activity') {
            setActivityEvents(prev => [...prev, message.payload as LiveKitActivityEvent]);
          } else if (message.type === 'clip_ready') {
            // Desktop recorded clip - show modal IMMEDIATELY with local preview
            // Instagram/TikTok pattern: preview while uploading in background
            console.log('[Remote] Received clip_ready (instant preview):', message.payload);
            setClipLocalUrl(message.payload.localUrl);
            setClipMediaUrl(message.payload.mediaUrl);  // null initially
            setClipThumbnailUrl(message.payload.thumbnailUrl);  // null initially
            setClipUploading(message.payload.uploading || false);
            setClipFileSize(message.payload.fileSize || 0);
            setClipUploadError(null);
            setClipCaption('');
            setClipPrice('');
            setClipPostType('free');
            setShowClipModal(true);
          } else if (message.type === 'clip_upload_complete') {
            // Desktop finished uploading - enable posting
            console.log('[Remote] Received clip_upload_complete:', message.payload);
            if (message.payload.success) {
              setClipMediaUrl(message.payload.mediaUrl);
              setClipThumbnailUrl(message.payload.thumbnailUrl);
              setClipUploading(false);
              setClipUploadError(null);
            } else {
              setClipUploading(false);
              setClipUploadError(message.payload.error || 'Upload failed');
            }
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
        connectionStateRef.current = 'idle';
        setConnected(false);
        setRemoteState(prev => ({ ...prev, isLive: false }));
      });

      await room.connect(livekitUrl, token);
      console.log('Connected to LiveKit room as remote control');
      connectionStateRef.current = 'connected';
      setConnected(true);
      setRemoteState(prev => ({ ...prev, isLive: true }));

      // Check for existing tracks from participants already in the room
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.track && publication.isSubscribed) {
            const track = publication.track;
            if (track.kind === 'video' && videoRef.current) {
              track.attach(videoRef.current);
              videoRef.current.muted = true;
              videoRef.current.play()
                .then(() => {
                  console.log('[Remote] Attached existing video track');
                  setVideoLoaded(true);
                })
                .catch(err => console.error('[Remote] Failed to play existing video:', err));
            } else if (track.kind === 'audio' && videoRef.current) {
              track.attach(videoRef.current);
              console.log('[Remote] Attached existing audio track');
            }
          }
        });
      });
    } catch (error) {
      console.error('Error connecting to stream:', error);
      connectionStateRef.current = 'idle';
    } finally {
      setConnecting(false);
    }
  };

  // Send control command to desktop
  const sendCommand = async (command: string, payload?: any) => {
    if (!roomRef.current?.localParticipant) return;

    const message = {
      type: 'remote_command',
      command,
      payload,
      timestamp: Date.now(),
    };

    const data = new TextEncoder().encode(JSON.stringify(message));
    await roomRef.current.localParticipant.publishData(data, { reliable: true });
  };

  // Control handlers
  const toggleCamera = () => sendCommand('toggle_camera');
  const toggleMicrophone = () => sendCommand('toggle_microphone');
  const toggleDesktopAudio = () => sendCommand('toggle_desktop_audio');
  const stopStream = () => sendCommand('stop_stream');
  const switchMicrophone = (deviceId: string) => sendCommand('switch_microphone', { deviceId });

  // Clipping is now handled on the desktop for better quality
  // Remote just sends commands, desktop records from original streams
  const startClip = () => sendCommand('start_clip');
  const stopClip = () => sendCommand('stop_clip');

  // Invite friend
  const inviteFriend = (friend: Friend) => {
    sendCommand('invite_friend', { friendId: friend.id, username: friend.username });
  };

  // Send chat message
  const handleSendChat = async () => {
    if (!chatInput.trim() || !roomRef.current?.localParticipant) return;

    const messageText = chatInput.trim();
    setChatInput('');

    const avatar = userData?.avatar || user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    const chatMessage: ChatMessage = {
      id: `creator-${Date.now()}`,
      user: username,
      message: messageText,
      avatar: avatar,
      isCreator: true,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, chatMessage]);

    // Send via LiveKit data channel
    const wireMessage: LiveKitChatMessage = {
      id: chatMessage.id,
      user: username,
      message: messageText,
      avatar: avatar?.startsWith('data:') ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` : avatar,
      isCreator: true,
      timestamp: Date.now(),
    };

    const data = new TextEncoder().encode(JSON.stringify({
      type: 'chat',
      payload: wireMessage,
    }));
    await roomRef.current.localParticipant.publishData(data, { reliable: true });
  };

  // Show toast notification (auto-dismiss after 3s)
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Resume video playback after modal closes (mobile browsers can pause it)
  const resumeVideoPlayback = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  };

  // Clip posting functions
  const postClip = async () => {
    if (!clipMediaUrl) return;

    setIsPostingClip(true);
    try {
      const formData = new FormData();
      formData.append('mediaUrl', clipMediaUrl);
      if (clipThumbnailUrl) {
        formData.append('thumbnailUrl', clipThumbnailUrl);
      }
      formData.append('mediaType', 'video');
      formData.append('type', clipPostType);
      if (clipCaption.trim()) {
        formData.append('title', clipCaption.trim());
      }
      if (clipPostType === 'paid' && clipPrice) {
        formData.append('price', clipPrice);
      }

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        cancelClip();
        showToast('Clip posted!', 'success');
        // Resume video after modal closes
        setTimeout(resumeVideoPlayback, 100);
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to post clip', 'error');
      }
    } catch (error) {
      console.error('Error posting clip:', error);
      showToast('Failed to post clip', 'error');
    } finally {
      setIsPostingClip(false);
    }
  };

  const cancelClip = () => {
    setClipLocalUrl(null);
    setClipMediaUrl(null);
    setClipThumbnailUrl(null);
    setClipUploading(false);
    setClipUploadError(null);
    setClipFileSize(0);
    setClipCaption('');
    setClipPrice('');
    setClipPostType('free');
    setShowClipModal(false);
  };

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Format time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatClipTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Only show loading on initial load, not during auth changes (to preserve video element)
  if (status === 'loading' && !connected && !roomFromParams) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Redirect to home if not authenticated and no room provided
  if (status === 'unauthenticated' && !roomFromUrl) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Show sign-in prompt when user scans QR code but is not authenticated
  if (status === 'unauthenticated' && roomFromUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <AuthModal />

        <div className="text-center space-y-6 max-w-sm">
          {/* Logo/Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <Radio className="h-10 w-10 text-white" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Remote Control</h1>
            <p className="text-gray-400">
              Sign in to control your live broadcast from this device
            </p>
          </div>

          {/* Sign In Button */}
          <Button
            onClick={() => setShowAuthModal(true)}
            className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Sign In to Continue
          </Button>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <div className="mx-auto w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mb-2">
                <Scissors className="h-5 w-5 text-orange-400" />
              </div>
              <span className="text-xs text-gray-400">Clip & Post</span>
            </div>
            <div className="text-center">
              <div className="mx-auto w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mb-2">
                <Video className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-xs text-gray-400">Control Camera</span>
            </div>
            <div className="text-center">
              <div className="mx-auto w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mb-2">
                <MessageSquare className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-xs text-gray-400">Live Chat</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userData?.avatar || user?.image || undefined} />
            <AvatarFallback className="bg-purple-600">
              {username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{status === 'authenticated' ? (userData?.username || username) : 'Not signed in'}</div>
            <div className="flex items-center gap-2">
              {status === 'authenticated' ? (
                <Badge className="bg-purple-600 text-xs">Signed In</Badge>
              ) : (
                <Badge className="bg-gray-600 text-xs">Guest</Badge>
              )}
              {connected ? (
                <Badge className="bg-green-600 text-xs">
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : connecting ? (
                <Badge className="bg-yellow-600 text-xs">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Connecting...
                </Badge>
              ) : (
                <Badge className="bg-gray-600 text-xs">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
              {remoteState.isLive && (
                <Badge className="bg-red-600 text-xs">LIVE</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Session</div>
          <div className="font-mono">{formatTime(remoteState.sessionTime)}</div>
        </div>
      </div>

      {/* Stats Bar */}
      {remoteState.isLive && (
        <div className="flex items-center justify-center gap-6 py-2 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="font-semibold">{remoteState.viewerCount}</span>
            <span className="text-gray-400 text-sm">viewers</span>
          </div>
        </div>
      )}

      {/* Live Stream Preview */}
      <div className="px-4 py-3">
        <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            muted
            autoPlay
          />
          {!videoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              {connecting ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <span className="text-gray-400 text-sm">Connecting to stream...</span>
                </div>
              ) : connected && remoteState.isLive ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <span className="text-gray-400 text-sm">Loading video...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Video className="h-8 w-8 text-gray-600" />
                  <span className="text-gray-500 text-sm">
                    {remoteState.isLive ? 'Waiting for video...' : 'No active stream'}
                  </span>
                </div>
              )}
            </div>
          )}
          {remoteState.isLive && videoLoaded && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-red-600 text-xs animate-pulse">● LIVE</Badge>
            </div>
          )}

          {/* Audio Mute/Unmute Button */}
          {videoLoaded && (
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                  setAudioMuted(videoRef.current.muted);
                }
              }}
              className="absolute bottom-2 right-2 p-2 bg-black/70 rounded-full hover:bg-black/90 transition-colors"
            >
              {audioMuted ? (
                <VolumeX className="h-5 w-5 text-white" />
              ) : (
                <Volume2 className="h-5 w-5 text-white" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Big Clip Button */}
      <div className="px-4 py-4">
        <Button
          onClick={remoteState.isClipping ? stopClip : startClip}
          disabled={!connected || !remoteState.isLive}
          className={`w-full h-20 text-xl font-bold rounded-2xl transition-all ${
            remoteState.isClipping
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600'
          }`}
        >
          {remoteState.isClipping ? (
            <>
              <CircleDot className="h-8 w-8 mr-3" />
              Recording {formatClipTime(remoteState.clipTime)}
            </>
          ) : (
            <>
              <Scissors className="h-8 w-8 mr-3" />
              Start Clip
            </>
          )}
        </Button>
      </div>

      {/* Control Buttons Grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {/* Camera */}
          <Button
            variant="outline"
            onClick={toggleCamera}
            disabled={!connected}
            className={`h-16 flex flex-col items-center justify-center gap-1 ${
              remoteState.cameraEnabled
                ? 'text-green-400 border-green-400'
                : 'text-red-400 border-red-400'
            }`}
          >
            {remoteState.cameraEnabled ? (
              <Video className="h-6 w-6" />
            ) : (
              <VideoOff className="h-6 w-6" />
            )}
            <span className="text-xs">Camera</span>
          </Button>

          {/* Microphone */}
          <Button
            variant="outline"
            onClick={toggleMicrophone}
            disabled={!connected}
            className={`h-16 flex flex-col items-center justify-center gap-1 ${
              remoteState.microphoneEnabled
                ? 'text-green-400 border-green-400'
                : 'text-red-400 border-red-400'
            }`}
          >
            {remoteState.microphoneEnabled ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
            <span className="text-xs">Mic</span>
          </Button>

          {/* Desktop Audio (only when screen sharing) */}
          {remoteState.screenSharing && (
            <Button
              variant="outline"
              onClick={toggleDesktopAudio}
              disabled={!connected}
              className={`h-16 flex flex-col items-center justify-center gap-1 ${
                remoteState.desktopAudioEnabled
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 border-gray-400'
              }`}
            >
              {remoteState.desktopAudioEnabled ? (
                <Volume2 className="h-6 w-6" />
              ) : (
                <VolumeX className="h-6 w-6" />
              )}
              <span className="text-xs">Desktop</span>
            </Button>
          )}

          {/* Stop Stream */}
          <Button
            variant="outline"
            onClick={stopStream}
            disabled={!connected || !remoteState.isLive}
            className="h-16 flex flex-col items-center justify-center gap-1 text-red-500 border-red-500 col-span-2"
          >
            <Square className="h-6 w-6" />
            <span className="text-xs">Stop Stream</span>
          </Button>
        </div>

        {/* Microphone Selector */}
        {remoteState.audioDevices.length > 1 && (
          <div className="mt-3 flex items-center gap-2">
            <Mic className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              value={remoteState.selectedAudioDevice}
              onChange={(e) => switchMicrophone(e.target.value)}
              disabled={!connected}
              className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-2 py-2 border border-gray-700 focus:outline-none focus:border-purple-500"
            >
              {remoteState.audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Mic ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-gray-400'
          }`}
        >
          <MessageSquare className="h-4 w-4 inline mr-2" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'activity'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-gray-400'
          }`}
        >
          <Activity className="h-4 w-4 inline mr-2" />
          Activity
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'friends'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-gray-400'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Friends
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <>
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No messages yet
                </div>
              ) : (
                chatMessages.slice(-50).map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`flex items-start gap-2 ${
                      msg.isCreator ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.avatar} />
                      <AvatarFallback className="bg-gray-700 text-xs">
                        {msg.user?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                        msg.isCreator
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-white'
                      }`}
                    >
                      <div className="text-xs text-gray-300 mb-1">
                        {msg.user}
                        {msg.tip && (
                          <span className="ml-2 text-yellow-400">
                            <Zap className="h-3 w-3 inline" /> ${msg.tip}
                          </span>
                        )}
                      </div>
                      <div className="text-sm break-words">{msg.message}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Send a message..."
                  className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                  size="icon"
                  className="rounded-full bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activityEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No activity yet
              </div>
            ) : (
              [...activityEvents].reverse().slice(0, 50).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={event.avatar} />
                    <AvatarFallback className="bg-gray-700">
                      {event.user?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{event.user}</div>
                    <div className="text-xs text-gray-400">
                      {event.type === 'follow' && 'Started following you'}
                      {event.type === 'like' && 'Liked your stream'}
                      {event.type === 'tip' && (
                        <span className="text-yellow-400">
                          Sent ${event.amount}
                        </span>
                      )}
                      {event.type === 'join' && 'Joined the stream'}
                    </div>
                  </div>
                  <div className="text-right">
                    {event.type === 'follow' && (
                      <Heart className="h-5 w-5 text-pink-500" />
                    )}
                    {event.type === 'like' && (
                      <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                    )}
                    {event.type === 'tip' && (
                      <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    )}
                    {event.type === 'join' && (
                      <Users className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {friendsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-500" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No friends yet
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.avatar || undefined} />
                    <AvatarFallback className="bg-gray-700">
                      {friend.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">
                      {friend.displayName || friend.username}
                    </div>
                    <div className="text-xs text-gray-400">
                      @{friend.username}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => inviteFriend(friend)}
                    disabled={!connected || !remoteState.isLive}
                    className="text-purple-400 border-purple-400"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Invite
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Clip Post Modal */}
      {showClipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={cancelClip} />
          <div className="relative bg-[#1a1a1d] rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={cancelClip}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-xl font-bold mb-4">Post Clip</h2>

            {/* Video Preview - uses localUrl for instant preview */}
            {clipLocalUrl && (
              <div className="mb-4 rounded-lg overflow-hidden bg-black relative">
                <video
                  src={clipLocalUrl}
                  controls
                  className="w-full max-h-64 object-contain"
                  playsInline
                />
                {/* Upload Progress Overlay */}
                {clipUploading && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      <span className="text-white">
                        Uploading {clipFileSize.toFixed(1)} MB...
                      </span>
                    </div>
                    <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse w-2/3" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Error Message */}
            {clipUploadError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">
                  Upload failed: {clipUploadError}. Please try recording again.
                </p>
              </div>
            )}

            {/* Upload Success Indicator */}
            {!clipUploading && clipMediaUrl && !clipUploadError && (
              <div className="mb-4 p-2 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-400 text-sm text-center">
                  ✓ Ready to post
                </p>
              </div>
            )}

            {/* Caption Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Caption</label>
              <textarea
                value={clipCaption}
                onChange={(e) => setClipCaption(e.target.value)}
                placeholder="Add a caption to your clip..."
                className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={3}
              />
            </div>

            {/* Post Type Selection */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Post Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setClipPostType('free')}
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                    clipPostType === 'free'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Globe className="h-4 w-4" />
                  Free
                </button>
                <button
                  onClick={() => setClipPostType('paid')}
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                    clipPostType === 'paid'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  Paid
                </button>
              </div>
            </div>

            {/* Price Input (for paid posts) */}
            {clipPostType === 'paid' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Price (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="number"
                    value={clipPrice}
                    onChange={(e) => setClipPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Sign in message if not authenticated */}
            {status !== 'authenticated' && (
              <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  You need to sign in to post clips.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={cancelClip}
                variant="outline"
                className="flex-1"
                disabled={isPostingClip}
              >
                Cancel
              </Button>
              <Button
                onClick={postClip}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={isPostingClip || status !== 'authenticated' || clipUploading || !clipMediaUrl || !!clipUploadError}
              >
                {isPostingClip ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : clipUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : clipUploadError ? (
                  'Upload Failed'
                ) : status !== 'authenticated' ? (
                  'Sign in to Post'
                ) : !clipMediaUrl ? (
                  'Waiting...'
                ) : (
                  'Post Clip'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white font-medium animate-in fade-in slide-in-from-top-2 duration-200`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function RemotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <RemoteContent />
    </Suspense>
  );
}
