'use client';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Trophy,
  Users,
  Radio,
  DollarSign,
  Eye,
  Loader2,
  Clock,
  MessageSquare,
  ChevronDown,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Square,
  Heart,
  UserPlus,
  Monitor,
  MonitorOff,
  X,
  Volume2,
  VolumeX,
  Gamepad2,
  Music,
  Camera,
  Zap,
  FlipHorizontal,
  Settings,
  Scissors,
  CircleDot,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { RoomEvent } from 'livekit-client';
import { LiveKitStreamer, LiveKitChatMessage, LiveKitActivityEvent } from '@/lib/livekit-stream';
import { ChatMessage } from '@/lib/types';
import { supabase, POSTS_BUCKET } from '@/lib/supabase';

// Friend data from /api/user/friends
interface Friend {
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
interface UserData {
  id: string;
  username: string | null;
  email: string | null;
  walletAddress: string | null;
  avatar: string | null;
  hasCompletedOnboarding: boolean;
}

function GoLiveContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLive, setIsLive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  // VIDEO/PHOTO/LIVE mode for mobile camera
  type CameraMode = 'VIDEO' | 'PHOTO' | 'LIVE';
  const [cameraMode, setCameraMode] = useState<CameraMode>('PHOTO');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<Blob | null>(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordedChunksRef = React.useRef<Blob[]>([]);
  const recordingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Live stream clipping state
  const [isClipping, setIsClipping] = useState(false);
  const [clipTime, setClipTime] = useState(0);
  const [showClipModal, setShowClipModal] = useState(false);
  const [clipBlob, setClipBlob] = useState<Blob | null>(null);
  const [clipVideoUrl, setClipVideoUrl] = useState<string | null>(null);
  const [clipCaption, setClipCaption] = useState('');
  const [clipPrice, setClipPrice] = useState('');
  const [clipPostType, setClipPostType] = useState<'free' | 'paid'>('free');
  const [isPostingClip, setIsPostingClip] = useState(false);
  const [isUploadingClip, setIsUploadingClip] = useState(false);
  const clipRecorderRef = React.useRef<MediaRecorder | null>(null);
  const clipChunksRef = React.useRef<Blob[]>([]);
  const clipTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const desktopVideoRef = React.useRef<HTMLVideoElement>(null);
  const previewVideoRef = React.useRef<HTMLVideoElement>(null);
  const previewStreamRef = React.useRef<MediaStream | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const livekitStreamerRef = React.useRef<LiveKitStreamer | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const cameraEnabledRef = React.useRef(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [screenSharing, setScreenSharing] = useState(false);
  const [desktopAudioEnabled, setDesktopAudioEnabled] = useState(true);
  const desktopAudioTrackRef = React.useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const pipVideoRef = React.useRef<HTMLVideoElement>(null);
  const compositeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const compositeAnimationRef = React.useRef<number | null>(null);
  const compositeStreamRef = React.useRef<MediaStream | null>(null); // Store canvas capture stream to avoid multiple captureStream() calls
  const mixedAudioContextRef = React.useRef<AudioContext | null>(null);
  const mixedAudioDestinationRef = React.useRef<MediaStreamAudioDestinationNode | null>(null);
  const originalMicTrackRef = React.useRef<MediaStreamTrack | null>(null);
  const screenAudioSourceRef = React.useRef<MediaStreamAudioSourceNode | null>(null);
  const screenAudioGainRef = React.useRef<GainNode | null>(null);
  const micAudioGainRef = React.useRef<GainNode | null>(null);

  // PiP position and size state (for 1080p canvas)
  const [pipPosition, setPipPosition] = useState({ x: 1440, y: 30 }); // top-right default
  const [pipSize, setPipSize] = useState({ width: 450, height: 338 });
  const pipPositionRef = React.useRef({ x: 1440, y: 30 });
  const pipSizeRef = React.useRef({ width: 450, height: 338 });
  const [pipControlsVisible, setPipControlsVisible] = useState(true);
  const pipControlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamCategory, setStreamCategory] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const thumbnailIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const currentRoomNameRef = React.useRef<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  const [activityEvents, setActivityEvents] = useState<LiveKitActivityEvent[]>([]);
  const activityContainerRef = React.useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Guest PiP state for inviting friends to stream
  const [guestActive, setGuestActive] = useState(false);
  const [guestUsername, setGuestUsername] = useState<string | null>(null);
  const [guestRoomName, setGuestRoomName] = useState<string | null>(null);
  const guestVideoRef = React.useRef<HTMLVideoElement | null>(null); // Hidden video for canvas composite
  const guestDisplayVideoRef = React.useRef<HTMLVideoElement | null>(null); // Visible video for UI overlay
  const guestLivekitRef = React.useRef<LiveKitStreamer | null>(null);
  const [guestPipPosition, setGuestPipPosition] = useState({ x: 30, y: 30 }); // top-left default
  const [guestPipSize, setGuestPipSize] = useState({ width: 253, height: 450 }); // portrait 9:16
  const guestPipPositionRef = React.useRef({ x: 30, y: 30 });
  const guestPipSizeRef = React.useRef({ width: 253, height: 450 });
  const [guestPipControlsVisible, setGuestPipControlsVisible] = useState(true);
  const guestPipControlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const guestCompositeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const guestCompositeIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [guestAudioMuted, setGuestAudioMuted] = useState(false);
  const guestAudioContextRef = React.useRef<AudioContext | null>(null);
  const guestAudioDestinationRef = React.useRef<MediaStreamAudioDestinationNode | null>(null);

  // Remote control state broadcasting
  const remoteStateBroadcastRef = React.useRef<NodeJS.Timeout | null>(null);

  // Preview room state (for remote to connect before going live)
  const [previewRoomConnected, setPreviewRoomConnected] = useState(false);
  const previewRoomRef = React.useRef<LiveKitStreamer | null>(null);

  // Incoming invite notification state
  interface IncomingInvite {
    fromUsername: string;
    fromRoomName: string;
    fromAvatar?: string;
    timestamp: number;
  }
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ toUsername: string; toRoomName: string } | null>(null);
  const inviteTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const invitePollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-start state for coming from camera page
  const autoStartTriggeredRef = useRef(false);
  const [shouldAutoStart, setShouldAutoStart] = useState(false);
  const handleGoLiveRef = useRef<(() => void) | null>(null);

  const user = session?.user as any;
  const userId = user?.id;
  const username = userData?.username || user?.name || 'User';

  // Enumerate audio devices
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        // Set default device if not already selected
        if (!selectedAudioDevice && audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error enumerating audio devices:', error);
      }
    };

    getAudioDevices();

    // Listen for device changes (e.g., plugging in headphones)
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getAudioDevices);
    };
  }, []);

  // Check for auto-start from camera page (must be before early returns)
  useEffect(() => {
    const category = searchParams.get('category');
    if (category && !autoStartTriggeredRef.current) {
      // Set the category immediately
      setStreamCategory(category);
      // Mark that we should auto-start once everything is loaded
      setShouldAutoStart(true);
    }
  }, [searchParams]);

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        router.push('/');
        return;
      }

      try {
        const response = await fetch('/api/user/me');
        const data = await response.json();

        if (!data.user) {
          router.push('/');
          return;
        }

        // If onboarding not complete, redirect to onboarding
        if (!data.user.hasCompletedOnboarding || !data.user.username) {
          router.push('/onboarding');
          return;
        }

        setUserData(data.user);
        setUserLoading(false);
      } catch (error) {
        console.error('Error checking onboarding:', error);
        setUserLoading(false);
      }
    };

    checkOnboarding();
  }, [status, router]);


  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Start camera preview for mobile (before going live)
  useEffect(() => {
    const startPreview = async () => {
      // Only start preview on mobile and when not already live
      if (isLive) return;

      // Check if we're on mobile (window width < 1024)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
      if (!isMobile) return;

      try {
        // Stop any existing preview stream
        if (previewStreamRef.current) {
          previewStreamRef.current.getTracks().forEach(track => track.stop());
        }

        // Request audio too for video recording mode
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: selectedAudioDevice
            ? { deviceId: { exact: selectedAudioDevice } }
            : true,
        });

        previewStreamRef.current = stream;
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera preview access denied:', err);
        // Try again without audio if permission denied
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
          previewStreamRef.current = stream;
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
          }
        } catch (err2) {
          console.error('Camera access completely denied:', err2);
        }
      }
    };

    if (status === 'authenticated' && !isLive) {
      startPreview();
    }

    return () => {
      // Clean up preview stream when going live or unmounting
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [status, isLive, selectedAudioDevice]);

  // Create preview room for remote control (desktop only, before going live)
  useEffect(() => {
    const setupPreviewRoom = async () => {
      // Only on desktop (not mobile) and when not already live
      if (isLive || !userData?.id) return;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
      if (isMobile) return;
      if (previewRoomRef.current) return; // Already connected

      try {
        console.log('[GoLive] Setting up preview room for remote control...');

        // Get camera stream for preview broadcast
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 24 },
            facingMode: 'user',
          },
          audio: selectedAudioDevice
            ? { deviceId: { exact: selectedAudioDevice }, echoCancellation: true, noiseSuppression: true }
            : { echoCancellation: true, noiseSuppression: true },
        });

        // Store for later use when going live
        streamRef.current = stream;
        setStreamReady(true);

        // Show in video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }

        // Create preview room with user-based name
        const roomName = `user-${userData.id}`;
        previewRoomRef.current = new LiveKitStreamer(roomName);

        // Start broadcasting preview (viewers can see but stream not "live" in DB)
        await previewRoomRef.current.startBroadcast(stream);
        console.log('[GoLive] Preview room connected:', roomName);
        setPreviewRoomConnected(true);
        setCurrentRoomName(roomName);
        currentRoomNameRef.current = roomName;

        // Listen for remote commands in preview mode
        const room = previewRoomRef.current.getRoom();
        if (room) {
          room.on(RoomEvent.DataReceived, (data: Uint8Array) => {
            try {
              const message = JSON.parse(new TextDecoder().decode(data));
              if (message.type === 'remote_command') {
                handlePreviewRemoteCommand(message.command, message.payload);
              }
            } catch (e) {
              // Ignore non-JSON
            }
          });
        }
      } catch (error) {
        console.error('[GoLive] Failed to setup preview room:', error);
      }
    };

    if (status === 'authenticated' && userData?.id && !isLive) {
      setupPreviewRoom();
    }

    return () => {
      // Clean up preview room when going live or unmounting
      if (previewRoomRef.current && !isLive) {
        previewRoomRef.current.close();
        previewRoomRef.current = null;
        setPreviewRoomConnected(false);
      }
    };
  }, [status, userData?.id, isLive, selectedAudioDevice]);

  // Handle remote commands in preview mode (before going live)
  const handlePreviewRemoteCommand = (command: string, payload?: any) => {
    console.log('[GoLive] Preview remote command:', command, payload);

    if (command === 'go_live') {
      // Trigger go live from remote
      if (handleGoLiveRef.current) {
        handleGoLiveRef.current();
      }
    } else if (command === 'toggle_camera') {
      toggleCamera();
    } else if (command === 'toggle_microphone') {
      toggleMicrophone();
    } else if (command === 'toggle_screen_share') {
      toggleScreenShare();
    }
  };

  // Broadcast preview state to remote (camera/mic status before going live)
  useEffect(() => {
    if (!previewRoomConnected || isLive || !previewRoomRef.current) return;

    const broadcastPreviewState = () => {
      const room = previewRoomRef.current?.getRoom();
      if (!room?.localParticipant) return;

      const state = {
        type: 'remote_state',
        state: {
          cameraEnabled,
          microphoneEnabled,
          screenSharing,
          desktopAudioEnabled,
          isClipping: false,
          clipTime: 0,
          isLive: false,
          viewerCount: 0,
          sessionTime: 0,
          audioDevices: audioDevices.map(d => ({ deviceId: d.deviceId, label: d.label })),
          selectedAudioDevice,
          previewMode: true, // Indicate we're in preview mode
        },
      };

      const data = new TextEncoder().encode(JSON.stringify(state));
      room.localParticipant.publishData(data, { reliable: false });
    };

    const interval = setInterval(broadcastPreviewState, 1000);
    broadcastPreviewState(); // Send immediately

    return () => clearInterval(interval);
  }, [previewRoomConnected, isLive, cameraEnabled, microphoneEnabled, screenSharing, desktopAudioEnabled, audioDevices, selectedAudioDevice]);

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (status !== 'authenticated') return;

      try {
        console.log('Fetching friends...');
        const response = await fetch('/api/user/friends');
        console.log('Friends response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Friends data:', data);
          setFriends(data.friends || []);
        } else {
          const errorData = await response.json();
          console.error('Friends API error:', errorData);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setFriendsLoading(false);
      }
    };

    fetchFriends();
    // Refresh friends list every 30 seconds to catch live status changes
    const interval = setInterval(fetchFriends, 30000);
    return () => clearInterval(interval);
  }, [status]);

  // Session timer - must be before any returns
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // Assign stream to video elements when it becomes available
  useEffect(() => {
    // Use a small delay to ensure the video elements are fully mounted
    const timer = setTimeout(() => {
      if (isLive && streamRef.current) {
        // Assign to mobile video ref
        if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
          console.log('Assigning stream to mobile video element');
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(err => console.error('Error playing mobile video:', err));
        }
        // Assign to desktop video ref
        if (desktopVideoRef.current && desktopVideoRef.current.srcObject !== streamRef.current) {
          console.log('Assigning stream to desktop video element');
          desktopVideoRef.current.srcObject = streamRef.current;
          desktopVideoRef.current.play().catch(err => console.error('Error playing desktop video:', err));
        }
      } else if (!isLive) {
        // Clear videos when not live
        if (videoRef.current) videoRef.current.srcObject = null;
        if (desktopVideoRef.current) desktopVideoRef.current.srcObject = null;
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isLive]);

  // Cleanup on unmount - inline the cleanup to avoid hoisting issues
  useEffect(() => {
    return () => {
      console.log('Cleaning up golive page...');

      // Close LiveKit connection first to free up peer connections
      if (livekitStreamerRef.current) {
        console.log('Closing LiveKit connection on unmount');
        livekitStreamerRef.current.close();
        livekitStreamerRef.current = null;
      }

      // Stop camera tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (desktopVideoRef.current) {
        desktopVideoRef.current.srcObject = null;
      }
      // Clear thumbnail interval
      if (thumbnailIntervalRef.current) {
        clearInterval(thumbnailIntervalRef.current);
        thumbnailIntervalRef.current = null;
      }
      // Cancel composite animation frame
      if (compositeAnimationRef.current) {
        cancelAnimationFrame(compositeAnimationRef.current);
        compositeAnimationRef.current = null;
      }
      // Close audio context
      if (mixedAudioContextRef.current) {
        mixedAudioContextRef.current.close();
        mixedAudioContextRef.current = null;
      }
    };
  }, []);

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Auto-scroll activity feed when new events arrive
  useEffect(() => {
    if (activityContainerRef.current) {
      activityContainerRef.current.scrollTop = activityContainerRef.current.scrollHeight;
    }
  }, [activityEvents]);

  // Poll for incoming invites via API (when live)
  useEffect(() => {
    if (isLive && userData?.username) {
      console.log('🔔 Starting invite polling for:', userData.username);

      // Poll for incoming invites every 2 seconds
      invitePollIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/stream/invite?username=${userData.username}`);
          const data = await response.json();

          if (data.hasInvite && data.invite) {
            console.log('📨 Found pending invite from:', data.invite.fromUsername);

            // Only show if we don't already have this invite displayed
            setIncomingInvite((prev) => {
              if (!prev || prev.fromUsername !== data.invite.fromUsername) {
                return {
                  fromUsername: data.invite.fromUsername,
                  fromRoomName: data.invite.fromRoomName,
                  fromAvatar: data.invite.fromAvatar,
                  timestamp: data.invite.timestamp,
                };
              }
              return prev;
            });
          }
        } catch (error) {
          console.error('Error polling for invites:', error);
        }
      }, 2000);

      return () => {
        if (invitePollIntervalRef.current) {
          clearInterval(invitePollIntervalRef.current);
        }
      };
    }
  }, [isLive, userData?.username]);

  // Track if we're still in loading state
  const isPageLoading = status === 'loading' || userLoading || !session?.user || !userData;

  // Photo capture for POST mode
  const capturePhoto = () => {
    if (!previewVideoRef.current || !canvasRef.current) return;

    const video = previewVideoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally for front camera mirror effect
    context.translate(canvas.width, 0);
    context.scale(-1, 1);

    // Draw the video frame
    context.drawImage(video, 0, 0);

    // Get the image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCaption('');
  };

  const postPhoto = async () => {
    if (!capturedImage) return;

    setIsPosting(true);

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('file', blob, 'photo.jpg');
      formData.append('type', 'free');
      if (caption.trim()) {
        formData.append('title', caption.trim());
      }

      // Upload the post
      const uploadResponse = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        // Success - redirect to home feed
        router.push('/');
      } else {
        const data = await uploadResponse.json();
        alert(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error posting photo:', error);
      alert('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  // Video recording functions
  const startRecording = () => {
    if (!previewStreamRef.current) return;

    recordedChunksRef.current = [];
    setRecordingTime(0);

    // Get supported MIME type
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const mediaRecorder = new MediaRecorder(previewStreamRef.current, {
      mimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      setCapturedVideo(blob);
      setCapturedVideoUrl(URL.createObjectURL(blob));
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // Collect data every second
    setIsRecording(true);

    // Start recording timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const retakeVideo = () => {
    if (capturedVideoUrl) {
      URL.revokeObjectURL(capturedVideoUrl);
    }
    setCapturedVideo(null);
    setCapturedVideoUrl(null);
    setCaption('');
    setRecordingTime(0);
  };

  const postVideo = async () => {
    if (!capturedVideo || !capturedVideoUrl) return;

    setIsPosting(true);

    try {
      // Generate thumbnail from the video (may be null if it fails)
      const thumbnail = await generateThumbnail(capturedVideoUrl);

      // Create form data - keep original video dimensions
      const formData = new FormData();
      formData.append('file', capturedVideo, 'video.webm');
      if (thumbnail) {
        formData.append('thumbnail', thumbnail, 'thumbnail.jpg');
      }
      formData.append('type', 'free');
      if (caption.trim()) {
        formData.append('title', caption.trim());
      }

      // Upload the post
      const uploadResponse = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        // Success - redirect to home feed
        router.push('/');
      } else {
        const data = await uploadResponse.json();
        alert(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error posting video:', error);
      alert('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate thumbnail from video
  const generateThumbnail = (videoUrl: string): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      const captureFrame = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(video, 0, 0);
          canvas.toBlob(
            (blob) => {
              resolve(blob);
            },
            'image/jpeg',
            0.8
          );
        } catch (e) {
          console.error('Error capturing thumbnail frame:', e);
          resolve(null);
        }
      };

      video.onloadeddata = () => {
        // Seek to 0.1 seconds then capture
        video.currentTime = 0.1;
      };

      video.onseeked = () => {
        captureFrame();
      };

      video.onerror = () => {
        console.error('Failed to load video for thumbnail');
        resolve(null); // Return null instead of rejecting
      };

      // Timeout fallback - if video doesn't load in 5 seconds, skip thumbnail
      setTimeout(() => {
        if (video.readyState >= 2) {
          captureFrame();
        } else {
          resolve(null);
        }
      }, 5000);

      video.load();
    });
  };

  // Ref to store cloned stream for recording
  const clipStreamRef = React.useRef<MediaStream | null>(null);

  // Ref to store AudioContext during recording (prevent garbage collection)
  const clipAudioContextRef = React.useRef<AudioContext | null>(null);

  // Live stream clipping functions - records from original high-quality streams
  const startClip = () => {
    // Build a recording stream from original sources (not WebRTC compressed)
    let recordStream = new MediaStream();

    console.log('[Clip] Starting clip...', {
      screenSharing,
      hasCompositeStream: !!compositeStreamRef.current,
      hasStreamRef: !!streamRef.current,
    });

    if (screenSharing && compositeStreamRef.current) {
      // When screen sharing, reuse the existing composite stream (don't call captureStream again!)
      // Calling captureStream() multiple times on the same canvas can stop the previous stream
      const videoTrack = compositeStreamRef.current.getVideoTracks()[0];
      console.log('[Clip] Composite video track:', videoTrack?.readyState);
      if (videoTrack) {
        recordStream.addTrack(videoTrack.clone());
        console.log('[Clip] Added video from existing composite stream');
      } else {
        console.error('[Clip] Composite video track not available');
      }

      // Add mic audio (cloned)
      const micTrack = streamRef.current?.getAudioTracks()[0];
      console.log('[Clip] Mic track:', micTrack?.readyState);
      if (micTrack) {
        recordStream.addTrack(micTrack.clone());
        console.log('[Clip] Added mic audio');
      }

      // Add desktop audio if available (cloned)
      console.log('[Clip] Desktop audio track:', desktopAudioTrackRef.current?.readyState);
      if (desktopAudioTrackRef.current) {
        recordStream.addTrack(desktopAudioTrackRef.current.clone());
        console.log('[Clip] Added desktop audio');
      }
    } else if (streamRef.current) {
      // Normal camera mode - clone tracks from camera stream
      console.log('[Clip] Camera mode - tracks:', streamRef.current.getTracks().map(t => `${t.kind}:${t.readyState}`));
      streamRef.current.getTracks().forEach(track => {
        recordStream.addTrack(track.clone());
      });
      console.log('[Clip] Recording from camera stream (cloned)');
    } else {
      console.error('[Clip] No stream available for recording');
      return;
    }

    if (recordStream.getTracks().length === 0) {
      console.error('[Clip] No tracks available for recording');
      return;
    }

    // Verify we have at least a video track
    if (recordStream.getVideoTracks().length === 0) {
      console.error('[Clip] No video track available for recording');
      return;
    }

    // If multiple audio tracks, mix them into one using Web Audio API
    const audioTracks = recordStream.getAudioTracks();

    if (audioTracks.length > 1) {
      console.log(`[Clip] Mixing ${audioTracks.length} audio tracks into one`);
      try {
        // Store AudioContext in ref to prevent garbage collection during recording
        const audioContext = new AudioContext();
        clipAudioContextRef.current = audioContext;
        const destination = audioContext.createMediaStreamDestination();

        audioTracks.forEach((track) => {
          const source = audioContext.createMediaStreamSource(new MediaStream([track]));
          const gain = audioContext.createGain();
          gain.gain.value = 0.7; // Reduce gain to prevent clipping when mixing
          source.connect(gain);
          gain.connect(destination);
        });

        // Remove original audio tracks from record stream (but keep them alive for the AudioContext sources!)
        audioTracks.forEach(track => {
          recordStream.removeTrack(track);
          // DON'T call track.stop() here - the AudioContext sources need these tracks alive
        });
        recordStream.addTrack(destination.stream.getAudioTracks()[0]);
        console.log('[Clip] Audio tracks mixed successfully');
      } catch (e) {
        console.error('[Clip] Audio mixing failed:', e);
      }
    }

    // Store for cleanup
    clipStreamRef.current = recordStream;
    clipChunksRef.current = [];
    setClipTime(0);

    // Log final recording stream with track states
    const videoTracks = recordStream.getVideoTracks();
    const finalAudioTracks = recordStream.getAudioTracks();
    console.log(`[Clip] Final stream: ${videoTracks.length} video (${videoTracks[0]?.readyState}), ${finalAudioTracks.length} audio`);

    // Get supported MIME type - VP8 is fastest for encoding, VP9 is higher quality
    // Note: H.264 requires MP4 container, not WebM
    const mimeTypes = [
      'video/webm;codecs=vp8,opus',  // VP8 is fast and well-supported
      'video/webm;codecs=vp9,opus',  // VP9 higher quality but slower
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9',
      'video/webm',
      'video/mp4;codecs=h264,aac',   // H.264 with MP4 container (Safari)
      'video/mp4',
    ];
    const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
    console.log('[Clip] Using mime type:', mimeType);

    // Create MediaRecorder with settings optimized for longer clips (up to 60s)
    // 4 Mbps × 60s = 30MB max, reasonable for upload
    const clipRecorder = new MediaRecorder(recordStream, {
      mimeType,
      videoBitsPerSecond: 4_000_000, // 4 Mbps - good quality, reasonable file size
      audioBitsPerSecond: 128_000,   // 128 kbps audio
    });

    // Pre-allocate array for chunks
    clipChunksRef.current = [];

    clipRecorder.ondataavailable = (event) => {
      console.log(`[Clip] ondataavailable fired, size: ${event.data.size}`);
      if (event.data.size > 0) {
        clipChunksRef.current.push(event.data);
        console.log(`[Clip] Chunk received: ${(event.data.size / 1024).toFixed(1)} KB, total chunks: ${clipChunksRef.current.length}`);
      } else {
        console.warn('[Clip] Empty chunk received - no data being recorded');
      }
    };

    // Add error handler to detect recording failures
    clipRecorder.onerror = (event: Event) => {
      console.error('[Clip] MediaRecorder error:', event);
      // Clean up on error
      setIsClipping(false);
      if (clipTimerRef.current) {
        clearInterval(clipTimerRef.current);
      }
    };

    // Monitor for track ending during recording
    recordStream.getTracks().forEach(track => {
      track.onended = () => {
        console.warn(`[Clip] Track ${track.kind} ended during recording`);
      };
    });

    clipRecorder.onstop = async () => {
      // Wrap entire handler in try/catch to ensure errors don't silently fail
      try {
        console.log('[Clip] onstop fired, chunks collected:', clipChunksRef.current.length);

        if (clipTimerRef.current) {
          clearInterval(clipTimerRef.current);
          clipTimerRef.current = null;
        }

        if (clipChunksRef.current.length === 0) {
          console.error('[Clip] No chunks recorded - recording failed');
          return;
        }

        const blob = new Blob(clipChunksRef.current, { type: mimeType });
        const fileSizeMB = blob.size / 1024 / 1024;
        console.log(`[Clip] Recording complete: ${fileSizeMB.toFixed(2)} MB, type: ${blob.type}`);

        // Clean up AudioContext to prevent memory leaks
        if (clipAudioContextRef.current) {
          try {
            await clipAudioContextRef.current.close();
          } catch (e) {
            console.warn('[Clip] AudioContext close error:', e);
          }
          clipAudioContextRef.current = null;
        }

        // Clean up cloned stream - only stop audio tracks, not video
        if (clipStreamRef.current) {
          clipStreamRef.current.getAudioTracks().forEach(track => track.stop());
          clipStreamRef.current = null;
        }

        // Validate blob before processing
        if (blob.size < 1000) {
          console.error('[Clip] Recording failed - blob too small:', blob.size);
          return;
        }

        // Helper to send data via LiveKit - uses ref to avoid stale closure
        const sendToRemote = async (messageData: object) => {
          const room = livekitStreamerRef.current?.getRoom();
          if (room?.localParticipant) {
            try {
              const data = new TextEncoder().encode(JSON.stringify(messageData));
              await room.localParticipant.publishData(data, { reliable: true });
              return true;
            } catch (e) {
              console.error('[Clip] Failed to send to remote:', e);
              return false;
            }
          }
          console.warn('[Clip] No room/participant to send to');
          return false;
        };

        // INSTANT: Send clip_ready so modal opens immediately on remote
        // Note: localUrl (blob URL) won't work on remote device, but we show it anyway
        // for desktop preview. Remote will show "uploading" state until mediaUrl arrives.
        const localUrl = URL.createObjectURL(blob);
        console.log(`[Clip] Sending clip_ready to remote, size: ${fileSizeMB.toFixed(2)} MB`);

        const sentReady = await sendToRemote({
          type: 'clip_ready',
          payload: {
            localUrl,           // Works on desktop, remote shows placeholder
            mediaUrl: null,     // Will be sent after upload
            thumbnailUrl: null,
            duration: clipTime,
            fileSize: fileSizeMB,
            uploading: true,
          },
        });

        if (sentReady) {
          console.log('[Clip] clip_ready sent - modal should open on remote');
        }

        // BACKGROUND: Upload directly to Supabase (bypasses Vercel's 4.5MB limit)
        setIsUploadingClip(true);
        try {
          // Generate thumbnail from local URL
          const thumbnail = await generateThumbnail(localUrl);

          // Step 1: Get signed URL from our API (small request, no file data)
          console.log('[Clip] Getting signed URL for direct upload...');
          const signedUrlResponse = await fetch('/api/clips/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileType: blob.type,
              fileSize: blob.size,
            }),
          });

          if (!signedUrlResponse.ok) {
            const errorData = await signedUrlResponse.json();
            throw new Error(errorData.error || 'Failed to get upload URL');
          }

          const { signedUrl, publicUrl, token, path } = await signedUrlResponse.json();
          console.log('[Clip] Got signed URL, uploading directly to Supabase...');

          // Step 2: Upload directly to Supabase using the SDK (bypasses Vercel limit!)
          const { error: uploadError } = await supabase.storage
            .from(POSTS_BUCKET)
            .uploadToSignedUrl(path, token, blob, {
              contentType: blob.type,
            });

          if (uploadError) {
            console.error('[Clip] Direct upload error:', uploadError);
            throw new Error(`Direct upload failed: ${uploadError.message}`);
          }

          console.log('[Clip] Direct upload complete:', publicUrl);

          // Step 3: Upload thumbnail through API (it's small, under 4.5MB)
          let thumbnailUrl: string | null = null;
          if (thumbnail) {
            const thumbFormData = new FormData();
            thumbFormData.append('thumbnail', thumbnail, 'thumbnail.jpg');
            const thumbResponse = await fetch('/api/clips/upload-thumbnail', {
              method: 'POST',
              body: thumbFormData,
            });
            if (thumbResponse.ok) {
              const thumbData = await thumbResponse.json();
              thumbnailUrl = thumbData.thumbnailUrl;
            }
          }

          await sendToRemote({
            type: 'clip_upload_complete',
            payload: { mediaUrl: publicUrl, thumbnailUrl, success: true },
          });
          console.log('[Clip] Sent upload complete to remote');
        } catch (error) {
          console.error('[Clip] Error uploading:', error);
          await sendToRemote({
            type: 'clip_upload_complete',
            payload: { success: false, error: String(error) },
          });
        } finally {
          setIsUploadingClip(false);
        }
      } catch (error) {
        console.error('[Clip] CRITICAL: onstop handler failed:', error);
        // Try to notify remote even if everything else failed
        try {
          const room = livekitStreamerRef.current?.getRoom();
          if (room?.localParticipant) {
            const data = new TextEncoder().encode(JSON.stringify({
              type: 'clip_upload_complete',
              payload: { success: false, error: 'Recording processing failed' },
            }));
            await room.localParticipant.publishData(data, { reliable: true });
          }
        } catch (e) {
          console.error('[Clip] Failed to notify remote of error:', e);
        }
      }
    };

    clipRecorderRef.current = clipRecorder;
    // 250ms timeslice - balances low CPU overhead with good audio sync
    // Smaller = better audio sync but more CPU, Larger = less CPU but potential sync drift
    clipRecorder.start(250);
    setIsClipping(true);
    console.log('[Clip] Recording started, state:', clipRecorder.state, 'mimeType:', mimeType);

    // Start clip timer
    // Max clip duration: 60 seconds to prevent memory issues
    const MAX_CLIP_DURATION = 60;
    clipTimerRef.current = setInterval(() => {
      setClipTime((prev) => {
        const newTime = prev + 1;
        // Auto-stop at max duration
        if (newTime >= MAX_CLIP_DURATION) {
          console.log('[Clip] Max duration reached, auto-stopping');
          stopClip();
        }
        return newTime;
      });
    }, 1000);
  };

  const stopClip = () => {
    if (clipRecorderRef.current && isClipping) {
      try {
        // Request any pending data before stopping to ensure all chunks are captured
        if (clipRecorderRef.current.state === 'recording') {
          clipRecorderRef.current.requestData();
        }
        clipRecorderRef.current.stop();
      } catch (e) {
        console.error('[Clip] Error stopping recorder:', e);
      }
      setIsClipping(false);
      if (clipTimerRef.current) {
        clearInterval(clipTimerRef.current);
      }
      console.log('[Clip] Recording stopped');
    }
  };

  const cancelClip = () => {
    if (clipVideoUrl) {
      URL.revokeObjectURL(clipVideoUrl);
    }
    setClipBlob(null);
    setClipVideoUrl(null);
    setClipCaption('');
    setClipPrice('');
    setClipPostType('free');
    setShowClipModal(false);
  };

  const postClip = async () => {
    if (!clipBlob || !clipVideoUrl) return;

    setIsPostingClip(true);

    try {
      // Generate thumbnail from the clip (may be null if it fails)
      const thumbnail = await generateThumbnail(clipVideoUrl);

      // Keep original video dimensions
      const formData = new FormData();
      formData.append('file', clipBlob, 'clip.webm');
      if (thumbnail) {
        formData.append('thumbnail', thumbnail, 'thumbnail.jpg');
      }
      formData.append('type', clipPostType);
      if (clipCaption.trim()) {
        formData.append('title', clipCaption.trim());
      }
      if (clipPostType === 'paid' && clipPrice) {
        formData.append('price', clipPrice);
      }

      const uploadResponse = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        // Success - close modal and reset
        cancelClip();
        alert('Clip posted successfully!');
      } else {
        const data = await uploadResponse.json();
        alert(data.error || 'Failed to post clip');
      }
    } catch (error) {
      console.error('Error posting clip:', error);
      alert('Failed to post clip');
    } finally {
      setIsPostingClip(false);
    }
  };

  // Convert video to portrait format (3:4 aspect ratio) by cropping center
  const convertToPortrait = (videoUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        const sourceAspect = sourceWidth / sourceHeight;

        // Target portrait dimensions (3:4 aspect ratio)
        const targetWidth = 720;
        const targetHeight = 960;
        const targetAspect = targetWidth / targetHeight; // 0.75

        let cropX = 0;
        let cropY = 0;
        let cropWidth = sourceWidth;
        let cropHeight = sourceHeight;

        if (sourceAspect > targetAspect) {
          // Source is wider than target (landscape) - crop sides
          cropWidth = sourceHeight * targetAspect;
          cropX = (sourceWidth - cropWidth) / 2;
        } else if (sourceAspect < targetAspect) {
          // Source is taller than target - crop top/bottom
          cropHeight = sourceWidth / targetAspect;
          cropY = (sourceHeight - cropHeight) / 2;
        }
        // If aspects match, no cropping needed

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Get supported MIME type
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2500000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };

        recorder.onerror = (e) => reject(e);

        // Start recording and play video
        recorder.start();
        video.play();

        // Draw frames to canvas
        const drawFrame = () => {
          if (video.ended || video.paused) {
            recorder.stop();
            return;
          }
          // Draw cropped center portion to fill portrait canvas
          ctx.drawImage(
            video,
            cropX, cropY, cropWidth, cropHeight, // Source: center crop
            0, 0, targetWidth, targetHeight       // Destination: full canvas
          );
          requestAnimationFrame(drawFrame);
        };

        video.onplay = () => {
          drawFrame();
        };

        video.onended = () => {
          setTimeout(() => recorder.stop(), 100);
        };
      };

      video.onerror = () => reject(new Error('Failed to load video'));
      video.load();
    });
  };

  const initials = username
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const startCamera = async () => {
    try {
      console.log('Starting camera with constraints:', { video: true, audio: true });

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Request both video and audio with optimized settings for streaming
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 24 },
          // Hint for hardware acceleration
          facingMode: 'user',
        },
        audio: selectedAudioDevice
          ? {
              deviceId: { exact: selectedAudioDevice },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
      });

      console.log('✅ Stream obtained successfully');
      console.log('Stream ID:', stream.id);
      console.log('Video tracks:', stream.getVideoTracks().map(t => ({
        id: t.id,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      })));
      console.log('Audio tracks:', stream.getAudioTracks().map(t => ({
        id: t.id,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      })));

      streamRef.current = stream;
      setStreamReady(true);

      // Assign stream to video elements immediately if they exist
      if (videoRef.current) {
        console.log('Mobile video element exists, assigning stream immediately');
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(err => {
          console.error('Error playing mobile video:', err);
        });
        console.log('✅ Mobile video playing');
      }
      if (desktopVideoRef.current) {
        console.log('Desktop video element exists, assigning stream immediately');
        desktopVideoRef.current.srcObject = stream;
        await desktopVideoRef.current.play().catch(err => {
          console.error('Error playing desktop video:', err);
        });
        console.log('✅ Desktop video playing');
      }
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          alert('Camera/microphone access was denied. Please allow access and try again.');
        } else if (error.name === 'NotFoundError') {
          alert('No camera or microphone found. Please connect a camera/microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          alert('Camera/microphone is already in use by another application.');
        } else {
          alert('Unable to access camera/microphone: ' + error.message);
        }
      } else {
        alert('Unable to access camera/microphone: ' + error);
      }
      throw error;
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (desktopVideoRef.current) {
      desktopVideoRef.current.srcObject = null;
    }
    setStreamReady(false);
  };

  const handleGoLive = async () => {
    try {
      console.log('=== STARTING GO LIVE PROCESS ===');

      // Call API to create stream record in database
      console.log('Creating stream record in database...');
      const response = await fetch('/api/stream/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: streamTitle || `${username}'s Live Stream`,
          category: streamCategory,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create stream:', error);
        alert(error.error || 'Failed to start stream');
        return;
      }

      const data = await response.json();
      console.log('Stream created:', data);
      setCurrentStreamId(data.stream.id);

      // Use user-based room name from API
      const roomName = data.roomName || `user-${userId}`;
      setCurrentRoomName(roomName);
      currentRoomNameRef.current = roomName; // Also set ref for use in intervals
      console.log('Using room name:', roomName);

      // Check if we already have a preview room running (started by desktop for remote control)
      if (previewRoomRef.current && streamRef.current) {
        console.log('Reusing preview room for live broadcast...');
        // Transfer preview room to live streamer
        livekitStreamerRef.current = previewRoomRef.current;
        previewRoomRef.current = null;
        setPreviewRoomConnected(false);
        setIsLive(true);
      } else {
        // Start camera BEFORE setting isLive
        console.log('Starting camera...');
        await startCamera();

        console.log('Camera started, stream ref:', streamRef.current);
        console.log('Setting isLive to true...');
        setIsLive(true);

        // Start LiveKit broadcast with room name
        if (streamRef.current) {
          // Close any existing LiveKit connection first
          if (livekitStreamerRef.current) {
            console.log('Closing existing LiveKit connection before starting new one');
            livekitStreamerRef.current.close();
            livekitStreamerRef.current = null;
          }

          console.log('Starting LiveKit broadcast...');
          livekitStreamerRef.current = new LiveKitStreamer(roomName);
        }
      }

      // Continue with setting up listeners if we have a streamer
      if (livekitStreamerRef.current && streamRef.current) {

        // Set up chat message listener BEFORE starting broadcast
        console.log('Setting up chat message listener on LiveKit streamer');
        livekitStreamerRef.current.onChatMessage(async (lkMessage: LiveKitChatMessage) => {
          console.log('=== GOLIVE: Received chat message ===', lkMessage);

          // Look up the user's actual avatar from database
          let avatar = lkMessage.avatar;
          try {
            const response = await fetch(`/api/user/lookup?username=${encodeURIComponent(lkMessage.user)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.user?.avatar) {
                avatar = data.user.avatar;
              }
            }
          } catch (error) {
            console.error('Failed to look up user avatar:', error);
          }

          const chatMessage: ChatMessage = {
            id: lkMessage.id,
            user: lkMessage.user,
            message: lkMessage.message,
            avatar: avatar,
            tip: lkMessage.tip,
            timestamp: new Date(lkMessage.timestamp),
            isCreator: lkMessage.isCreator,
          };
          console.log('Adding message to chatMessages state:', chatMessage);
          setChatMessages(prev => {
            console.log('Previous messages count:', prev.length);
            return [...prev, chatMessage];
          });
        });

        // Set up activity event listener for likes, follows, tips
        console.log('Setting up activity event listener on LiveKit streamer');
        livekitStreamerRef.current.onActivityEvent(async (event: LiveKitActivityEvent) => {
          console.log('=== GOLIVE: Received activity event ===', event);

          // Look up the user's actual avatar from database
          let avatar = event.avatar;
          try {
            const response = await fetch(`/api/user/lookup?username=${encodeURIComponent(event.user)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.user?.avatar) {
                avatar = data.user.avatar;
              }
            }
          } catch (error) {
            console.error('Failed to look up user avatar:', error);
          }

          const activityEvent: LiveKitActivityEvent = {
            ...event,
            avatar,
          };
          console.log('Adding event to activityEvents state:', activityEvent);
          setActivityEvents(prev => [...prev, activityEvent]);
        });

        // Note: Invite system now uses API polling instead of LiveKit data channel
        // This is more reliable across different network conditions

        // Only start broadcast if we didn't reuse a preview room (which is already broadcasting)
        if (!previewRoomConnected) {
          await livekitStreamerRef.current.startBroadcast(streamRef.current);
          console.log('LiveKit broadcast started for room:', roomName);
        } else {
          console.log('Reused preview room, already broadcasting');
        }

        // Start capturing thumbnails for all streams (token-based or user-based)
        startThumbnailCapture();
      } else {
        console.error('ERROR: streamRef.current is null after startCamera!');
      }

      console.log('=== GO LIVE COMPLETE ===');
    } catch (error) {
      console.error('Error starting stream:', error);
      alert('Failed to start stream: ' + (error as Error).message);
    }
  };

  // Store handleGoLive in ref so auto-start can call it
  handleGoLiveRef.current = handleGoLive;

  // Auto-start stream when coming from camera page with category
  // This effect triggers the go-live once user data is loaded
  useEffect(() => {
    if (shouldAutoStart && !isPageLoading && !isLive && !autoStartTriggeredRef.current) {
      autoStartTriggeredRef.current = true;
      setShouldAutoStart(false);

      // Small delay to ensure everything is ready, then trigger go live
      const timer = setTimeout(() => {
        if (handleGoLiveRef.current) {
          console.log('Auto-starting stream...');
          handleGoLiveRef.current();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [shouldAutoStart, isPageLoading, isLive]);

  const handleEndStream = async () => {
    console.log('=== STOPPING STREAM ===');
    console.log('currentStreamId:', currentStreamId);
    console.log('currentRoomName:', currentRoomName);
    console.log('currentRoomName:', currentRoomName);

    // Save roomName before clearing state
    const roomNameToDelete = currentRoomNameRef.current;

    try {
      // Stop guest composite and clean up guest
      if (guestActive) {
        await stopGuestComposite();
        if (guestLivekitRef.current) {
          guestLivekitRef.current.close();
          guestLivekitRef.current = null;
        }
        if (guestVideoRef.current) {
          guestVideoRef.current.srcObject = null;
          guestVideoRef.current = null;
        }
        setGuestActive(false);
        setGuestUsername(null);
        setGuestRoomName(null);
      }

      // Stop camera and UI regardless of stream ID
      stopCamera();
      setIsLive(false);
      setSessionTime(0);
      setStreamTitle('');
      setCurrentRoomName(null);
      currentRoomNameRef.current = null;
      setChatMessages([]); // Clear chat messages
      setActivityEvents([]); // Clear activity events

      // Stop LiveKit broadcast
      if (livekitStreamerRef.current) {
        console.log('Closing LiveKit broadcast');
        livekitStreamerRef.current.close();
        livekitStreamerRef.current = null;
      }

      // Stop thumbnail capture and delete thumbnail (pass saved roomName)
      await stopThumbnailCapture(roomNameToDelete);

      // Try to end stream in database if we have an ID
      if (currentStreamId) {
        console.log('Ending stream in database:', currentStreamId);
        const response = await fetch('/api/stream/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            streamId: currentStreamId,
          }),
        });

        if (!response.ok) {
          console.error('Failed to end stream in database');
        } else {
          console.log('✅ Stream ended in database');
        }
        setCurrentStreamId(null);
      } else {
        console.log('⚠️ No currentStreamId, cleaning up active streams for user');
        // If no stream ID, try to clean up any active streams
        if (userId) {
          await fetch('/api/stream/cleanup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }
      }

      console.log('=== STREAM STOPPED ===');
    } catch (error) {
      console.error('Error ending stream:', error);
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
        cameraEnabledRef.current = videoTrack.enabled;
      }
    }
  };

  const toggleMicrophone = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newEnabled = !audioTrack.enabled;
        audioTrack.enabled = newEnabled;
        setMicrophoneEnabled(newEnabled);
        console.log('Microphone', newEnabled ? 'enabled' : 'disabled');
      }
    }
  };

  // Switch microphone while streaming
  const switchMicrophone = async (deviceId: string) => {
    try {
      setSelectedAudioDevice(deviceId);

      // If not streaming, just update state - getUserMedia will use it later
      if (!streamRef.current || !isLive) return;

      // Get new audio track with selected device
      const newAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } }
      });
      const newAudioTrack = newAudioStream.getAudioTracks()[0];

      // Get old audio track
      const oldAudioTrack = streamRef.current.getAudioTracks()[0];

      // Replace in the local stream ref
      if (oldAudioTrack) {
        streamRef.current.removeTrack(oldAudioTrack);
        oldAudioTrack.stop();
      }
      streamRef.current.addTrack(newAudioTrack);

      // Update original mic track ref
      originalMicTrackRef.current = newAudioTrack;

      // Preserve enabled state
      newAudioTrack.enabled = microphoneEnabled;

      // Update LiveKit directly (no mixing needed - desktop audio is separate track)
      if (livekitStreamerRef.current) {
        await livekitStreamerRef.current.replaceAudioTrack(newAudioTrack);
      }

      console.log('Switched microphone to:', newAudioTrack.label);
    } catch (error) {
      console.error('Error switching microphone:', error);
    }
  };

  const toggleDesktopAudio = () => {
    const newEnabled = !desktopAudioEnabled;

    // Use the direct track enabled property (no Web Audio mixing)
    if (desktopAudioTrackRef.current) {
      desktopAudioTrackRef.current.enabled = newEnabled;
      setDesktopAudioEnabled(newEnabled);
      console.log(`Desktop audio ${newEnabled ? 'enabled' : 'disabled'}`);
    }
  };

  const stopCompositeStream = () => {
    if (compositeAnimationRef.current) {
      cancelAnimationFrame(compositeAnimationRef.current);
      compositeAnimationRef.current = null;
    }
    compositeStreamRef.current = null;
  };

  const startCompositeStream = async (screenStream: MediaStream, cameraStream: MediaStream) => {
    // Create canvas for compositing (1080p)
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    compositeCanvasRef.current = canvas;

    // Get 2D context with hardware acceleration hints
    const ctx = canvas.getContext('2d', {
      alpha: false, // No transparency needed - improves performance
      desynchronized: true, // Lower latency - don't wait for vsync
      willReadFrequently: false, // We only write to canvas, never read pixels
    });
    if (!ctx) return null;

    // Enable image smoothing for high quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Create video elements to draw from
    const screenVideo = document.createElement('video');
    screenVideo.srcObject = screenStream;
    screenVideo.muted = true;
    screenVideo.playsInline = true;
    screenVideo.autoplay = true;

    // For camera, clone the track so it's independent from LiveKit publishing
    const originalCameraTrack = cameraStream.getVideoTracks()[0];
    console.log('Original camera track:', originalCameraTrack?.label, 'enabled:', originalCameraTrack?.enabled, 'readyState:', originalCameraTrack?.readyState);

    // Clone the track to avoid conflicts
    const clonedCameraTrack = originalCameraTrack.clone();
    console.log('Cloned camera track:', clonedCameraTrack?.label, 'enabled:', clonedCameraTrack?.enabled, 'readyState:', clonedCameraTrack?.readyState);

    const cameraVideo = document.createElement('video');
    // Create a new stream with the cloned video track
    const cameraOnlyStream = new MediaStream([clonedCameraTrack]);
    cameraVideo.srcObject = cameraOnlyStream;
    cameraVideo.muted = true;
    cameraVideo.playsInline = true;
    cameraVideo.autoplay = true;

    // Start playing both videos (ignore AbortError - it's harmless)
    const playVideo = async (video: HTMLVideoElement, name: string) => {
      try {
        await video.play();
        console.log(`${name} video playing`);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error(`${name} video play error:`, e);
        }
      }
    };

    await playVideo(screenVideo, 'Screen');
    await playVideo(cameraVideo, 'Camera');

    // Wait for both videos to have frames
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('Screen video readyState:', screenVideo.readyState, 'size:', screenVideo.videoWidth, 'x', screenVideo.videoHeight);
    console.log('Camera video readyState:', cameraVideo.readyState, 'size:', cameraVideo.videoWidth, 'x', cameraVideo.videoHeight);

    // Helper to draw rounded rectangle
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // Use requestAnimationFrame for smoother rendering synced to display
    // This provides better frame pacing than setInterval
    let animationFrameId: number;
    let lastFrameTime = 0;
    const targetFrameInterval = 1000 / 30; // Target 30fps (33.33ms per frame)

    const renderFrame = (currentTime: number) => {
      // Throttle to ~30fps to avoid wasting CPU while maintaining smoothness
      const elapsed = currentTime - lastFrameTime;
      if (elapsed >= targetFrameInterval) {
        lastFrameTime = currentTime - (elapsed % targetFrameInterval);

        // Draw screen share as background (full canvas) - no need to clear if we fill entire canvas
        if (screenVideo.readyState >= 2 && screenVideo.videoWidth > 0) {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        } else {
          // Only clear if no screen video yet
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw guest PiP if active (draw first so camera PiP appears on top)
        const guestVideo = guestVideoRef.current;
        if (guestVideo && guestVideo.readyState >= 2 && guestVideo.videoWidth > 0) {
          const guestX = guestPipPositionRef.current.x;
          const guestY = guestPipPositionRef.current.y;
          const guestWidth = guestPipSizeRef.current.width;
          const guestHeight = guestPipSizeRef.current.height;

          // Draw rounded border for guest PiP (green)
          ctx.fillStyle = '#22c55e';
          roundRect(guestX - 4, guestY - 4, guestWidth + 8, guestHeight + 8, 12);
          ctx.fill();

          // Draw guest feed with rounded corners (clip)
          ctx.save();
          roundRect(guestX, guestY, guestWidth, guestHeight, 8);
          ctx.clip();
          ctx.drawImage(guestVideo, guestX, guestY, guestWidth, guestHeight);
          ctx.restore();
        }

        // Only draw camera PiP if camera is enabled
        if (cameraEnabledRef.current) {
          // Get current PiP position and size from refs (updated by drag/resize)
          const pipX = pipPositionRef.current.x;
          const pipY = pipPositionRef.current.y;
          const pipWidth = pipSizeRef.current.width;
          const pipHeight = pipSizeRef.current.height;

          // Draw rounded border for PiP
          ctx.fillStyle = '#8b5cf6';
          roundRect(pipX - 4, pipY - 4, pipWidth + 8, pipHeight + 8, 12);
          ctx.fill();

          // Draw camera feed with rounded corners (clip)
          ctx.save();
          roundRect(pipX, pipY, pipWidth, pipHeight, 8);
          ctx.clip();
          if (cameraVideo.readyState >= 2 && cameraVideo.videoWidth > 0) {
            ctx.drawImage(cameraVideo, pipX, pipY, pipWidth, pipHeight);
          }
          ctx.restore();
        }
      }

      // Continue the render loop
      animationFrameId = requestAnimationFrame(renderFrame);
    };

    // Start the render loop
    animationFrameId = requestAnimationFrame(renderFrame);

    // Store animation frame ID for cleanup (cast to number for compat)
    compositeAnimationRef.current = animationFrameId;

    // Get stream from canvas at 30fps - store it so we can reuse for clipping
    const compositeStream = canvas.captureStream(30);
    compositeStreamRef.current = compositeStream;
    return compositeStream.getVideoTracks()[0];
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop screen sharing
      stopCompositeStream();
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }

      // Unpublish desktop audio track
      if (livekitStreamerRef.current) {
        await livekitStreamerRef.current.unpublishAdditionalAudioTrack('desktop-audio');
        console.log('Unpublished desktop audio track');
      }
      desktopAudioTrackRef.current = null;

      // Switch back to camera in preview
      if (streamRef.current && desktopVideoRef.current) {
        desktopVideoRef.current.srcObject = streamRef.current;
        desktopVideoRef.current.play().catch(err => console.error('Error playing camera:', err));
      }

      // Switch back to camera in LiveKit broadcast
      if (livekitStreamerRef.current && streamRef.current) {
        const cameraTrack = streamRef.current.getVideoTracks()[0];
        console.log('Switching back to camera track:', cameraTrack?.label, 'enabled:', cameraTrack?.enabled);
        if (cameraTrack) {
          // Clone the track to ensure it's fresh
          const freshCameraTrack = cameraTrack.clone();
          await livekitStreamerRef.current.replaceVideoTrack(freshCameraTrack);
        }
      }
      setScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30, max: 30 },
            // Request cursor and preferCurrentTab for better UX
            cursor: 'always',
          } as MediaTrackConstraints,
          audio: {
            // Optimize desktop audio capture
            echoCancellation: false, // Don't process desktop audio
            noiseSuppression: false,
            autoGainControl: false,
          }
        });
        screenStreamRef.current = screenStream;

        // Handle audio: publish desktop audio as additional track (no Web Audio mixing - avoids buffer issues)
        const screenAudioTrack = screenStream.getAudioTracks()[0];
        const micAudioTrack = streamRef.current?.getAudioTracks()[0];

        if (micAudioTrack) {
          originalMicTrackRef.current = micAudioTrack;
        }

        // Publish desktop audio as a separate track if available
        if (screenAudioTrack && livekitStreamerRef.current) {
          // Store the desktop audio track for muting control
          desktopAudioTrackRef.current = screenAudioTrack;
          screenAudioTrack.enabled = desktopAudioEnabled;

          // Publish desktop audio as additional audio track
          await livekitStreamerRef.current.publishAdditionalAudioTrack(screenAudioTrack, 'desktop-audio');
          console.log('Published desktop audio as separate track');
        }

        // Keep mic running as-is (already published)

        // Create composite stream with screen + camera PiP
        if (streamRef.current) {
          const compositeTrack = await startCompositeStream(screenStream, streamRef.current);

          if (compositeTrack && livekitStreamerRef.current) {
            // Send composite to LiveKit broadcast
            await livekitStreamerRef.current.replaceVideoTrack(compositeTrack);

            // Show composite in preview too
            const compositeStream = new MediaStream([compositeTrack]);
            if (desktopVideoRef.current) {
              desktopVideoRef.current.srcObject = compositeStream;
            }
          }
        }

        // Handle when user stops sharing via browser UI
        screenStream.getVideoTracks()[0].onended = async () => {
          stopCompositeStream();

          // Unpublish desktop audio track
          if (livekitStreamerRef.current) {
            await livekitStreamerRef.current.unpublishAdditionalAudioTrack('desktop-audio');
            console.log('Unpublished desktop audio track');
          }
          desktopAudioTrackRef.current = null;

          if (streamRef.current && desktopVideoRef.current) {
            desktopVideoRef.current.srcObject = streamRef.current;
          }
          // Switch back to camera in LiveKit broadcast
          if (livekitStreamerRef.current && streamRef.current) {
            const cameraTrack = streamRef.current.getVideoTracks()[0];
            if (cameraTrack) {
              await livekitStreamerRef.current.replaceVideoTrack(cameraTrack);
            }
          }
          screenStreamRef.current = null;
          setScreenSharing(false);
        };

        setScreenSharing(true);
        setPipControlsVisible(true);
        // Auto-hide controls after 3 seconds
        pipControlsTimeoutRef.current = setTimeout(() => {
          setPipControlsVisible(false);
        }, 3000);
      } catch (error) {
        console.error('Error starting screen share:', error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Send chat message as broadcaster
  const handleSendChat = async () => {
    if (!chatInput.trim() || !isLive || !livekitStreamerRef.current) return;

    const messageText = chatInput.trim();
    setChatInput('');

    const avatar = userData?.avatar || user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    const wireAvatar = avatar?.startsWith('data:')
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      : avatar;

    const chatMessage: ChatMessage = {
      id: `creator-${Date.now()}`,
      user: username,
      message: messageText,
      avatar: avatar,
      isCreator: true,
      timestamp: new Date(),
    };

    // Add to local chat immediately
    setChatMessages(prev => [...prev, chatMessage]);

    // Send via LiveKit to all viewers
    try {
      await livekitStreamerRef.current.sendChatMessage({
        id: chatMessage.id,
        user: username,
        message: messageText,
        avatar: wireAvatar,
        isCreator: true,
        timestamp: Date.now(),
      });
      console.log('Broadcaster message sent to viewers');
    } catch (error) {
      console.error('Failed to send broadcaster message:', error);
    }
  };

  // Broadcast remote state to mobile remote control clients
  const broadcastRemoteState = () => {
    if (!livekitStreamerRef.current || !isLive) return;

    const room = livekitStreamerRef.current.getRoom();
    if (!room?.localParticipant) return;

    const state = {
      type: 'remote_state',
      state: {
        cameraEnabled,
        microphoneEnabled,
        screenSharing,
        desktopAudioEnabled,
        isClipping,
        clipTime,
        isLive,
        viewerCount,
        sessionTime,
        audioDevices: audioDevices.map(d => ({ deviceId: d.deviceId, label: d.label })),
        selectedAudioDevice,
      },
    };

    const data = new TextEncoder().encode(JSON.stringify(state));
    room.localParticipant.publishData(data, { reliable: false }); // Use unreliable for frequent state updates
  };

  // Handle remote control commands from mobile
  const handleRemoteCommand = (command: string, payload?: any) => {
    console.log('Remote command received:', command, payload);

    switch (command) {
      case 'toggle_camera':
        toggleCamera();
        break;
      case 'toggle_microphone':
        toggleMicrophone();
        break;
      case 'toggle_screen_share':
        toggleScreenShare();
        break;
      case 'toggle_desktop_audio':
        toggleDesktopAudio();
        break;
      case 'start_clip':
        startClip();
        break;
      case 'stop_clip':
        stopClip();
        break;
      case 'stop_stream':
        handleEndStream();
        break;
      case 'invite_friend':
        if (payload?.friendId && payload?.username) {
          // Handle friend invite from remote
          const friend = friends.find(f => f.id === payload.friendId);
          if (friend) {
            handleInviteFriend(friend);
          }
        }
        break;
      case 'switch_microphone':
        if (payload?.deviceId) {
          switchMicrophone(payload.deviceId);
        }
        break;
      default:
        console.warn('Unknown remote command:', command);
    }
  };

  // Set up remote command listener when LiveKit is connected
  useEffect(() => {
    if (!isLive || !livekitStreamerRef.current) return;

    const room = livekitStreamerRef.current.getRoom();
    if (!room) return;

    const handleDataReceived = (data: Uint8Array, participant: any) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(data));
        if (message.type === 'remote_command') {
          handleRemoteCommand(message.command, message.payload);
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    // Start broadcasting state periodically
    remoteStateBroadcastRef.current = setInterval(broadcastRemoteState, 1000);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      if (remoteStateBroadcastRef.current) {
        clearInterval(remoteStateBroadcastRef.current);
        remoteStateBroadcastRef.current = null;
      }
    };
  }, [isLive, cameraEnabled, microphoneEnabled, screenSharing, desktopAudioEnabled, isClipping, clipTime, viewerCount, sessionTime]);

  // Immediately broadcast state when control states change (no 1-second delay)
  useEffect(() => {
    if (isLive && livekitStreamerRef.current) {
      broadcastRemoteState();
    }
  }, [cameraEnabled, microphoneEnabled, screenSharing, desktopAudioEnabled, isClipping, clipTime, selectedAudioDevice]);

  // Start guest composite stream (camera + guest PiP) for broadcast
  // Instead of canvas compositing (CPU intensive), we send guest info via data channel
  // and let viewers composite using CSS overlays (GPU accelerated)
  const startGuestComposite = async (roomName: string, username: string) => {
    if (!streamRef.current || !guestVideoRef.current) {
      console.log('Cannot start guest composite - missing streams');
      return;
    }

    console.log('Starting guest stream - using data channel approach for smooth playback');
    console.log('Guest room:', roomName, 'username:', username);

    // Send guest stream info to viewers via LiveKit data channel
    // Viewers will connect to the guest's stream separately and overlay it
    if (livekitStreamerRef.current && roomName) {
      const guestInfo = {
        type: 'guest_pip',
        action: 'start',
        guestRoomName: roomName,
        guestUsername: username,
        position: guestPipPositionRef.current,
        size: guestPipSizeRef.current,
      };

      // Send via data channel
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(guestInfo));
      const room = livekitStreamerRef.current.getRoom();
      if (room?.localParticipant) {
        await room.localParticipant.publishData(data, { reliable: true });
        console.log('✅ Guest PiP info sent to viewers:', guestInfo);
      }
    }

    // Mark composite as active (for cleanup purposes)
    // Also periodically resend the full guest info for viewers who join late
    console.log('📡 Setting up periodic guest PiP broadcast with:', roomName, username);

    guestCompositeIntervalRef.current = setInterval(() => {
      // Periodically send full guest info to viewers (including late joiners)
      if (livekitStreamerRef.current && roomName) {
        const guestInfo = {
          type: 'guest_pip',
          action: 'start', // Always send 'start' so late joiners get full info
          guestRoomName: roomName,
          guestUsername: username,
          position: guestPipPositionRef.current,
          size: guestPipSizeRef.current,
        };
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(guestInfo));
        const room = livekitStreamerRef.current.getRoom();
        if (room?.localParticipant) {
          room.localParticipant.publishData(data, { reliable: true }); // Use reliable for better delivery
          console.log('📡 Sent guest PiP update to viewers:', guestInfo);
        } else {
          console.log('📡 Cannot send - no local participant');
        }
      } else {
        console.log('📡 Cannot send - missing refs:', !!livekitStreamerRef.current, roomName);
      }
    }, 2000) as NodeJS.Timeout; // Send guest info every 2 seconds
  };

  // Stop guest composite and notify viewers
  const stopGuestComposite = async () => {
    console.log('Stopping guest stream...');

    // Stop the position update interval
    if (guestCompositeIntervalRef.current) {
      clearInterval(guestCompositeIntervalRef.current);
      guestCompositeIntervalRef.current = null;
    }

    // Notify viewers to remove guest PiP
    if (livekitStreamerRef.current) {
      const guestInfo = {
        type: 'guest_pip',
        action: 'stop',
      };
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(guestInfo));
      const room = livekitStreamerRef.current.getRoom();
      if (room?.localParticipant) {
        await room.localParticipant.publishData(data, { reliable: true });
        console.log('✅ Guest PiP stop sent to viewers');
      }
    }
  };

  // Send invite request to a friend via API (more reliable than LiveKit data channel)
  const handleInviteFriend = async (friend: Friend) => {
    if (!friend.isLive || !friend.liveStream?.roomName) {
      console.error('Friend is not live');
      return;
    }

    if (!currentRoomName || !livekitStreamerRef.current) {
      console.error('Not currently streaming');
      return;
    }

    console.log('📨 Sending invite request to:', friend.username);

    try {
      // Send invite via API
      const response = await fetch('/api/stream/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUsername: friend.username,
          fromUsername: username,
          fromRoomName: currentRoomName,
          fromAvatar: userData?.avatar,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send invite');
      }

      console.log('✅ Invite sent to:', friend.username);

      // Track pending invite
      setPendingInvite({ toUsername: friend.username!, toRoomName: friend.liveStream!.roomName });

      // Start polling for acceptance
      const pollForAcceptance = async () => {
        const checkResponse = await fetch(
          `/api/stream/invite?checkAcceptance=${friend.username}&fromUsername=${username}`
        );
        const data = await checkResponse.json();

        if (data.accepted) {
          console.log('🎉 Invite accepted by:', friend.username);
          // Connect to their stream
          const accepterRoomName = data.invite.accepterRoomName || friend.liveStream!.roomName;
          connectToGuestStream(accepterRoomName, friend.username!);
          setPendingInvite(null);
          return true;
        }
        return false;
      };

      // Poll every 2 seconds for 30 seconds
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        const accepted = await pollForAcceptance();
        if (accepted || pollCount >= 15) {
          clearInterval(pollInterval);
          if (pollCount >= 15) {
            console.log('Invite expired');
            setPendingInvite(null);
          }
        }
      }, 2000);

      // Store interval ref for cleanup
      if (inviteTimeoutRef.current) {
        clearTimeout(inviteTimeoutRef.current);
      }
      inviteTimeoutRef.current = setTimeout(() => {
        clearInterval(pollInterval);
        setPendingInvite(null);
      }, 30000);

    } catch (error) {
      console.error('Failed to send invite:', error);
    }
  };

  // Connect to guest stream after they accept the invite
  const connectToGuestStream = async (guestRoomNameParam: string, guestUsernameParam: string) => {
    console.log('🎬 Connecting to guest stream:', guestUsernameParam, guestRoomNameParam);

    // Connect to the friend's stream to pull their video
    const guestStreamer = new LiveKitStreamer(guestRoomNameParam);
    guestLivekitRef.current = guestStreamer;

    // Create a hidden video element to receive the guest's stream (for canvas composite)
    const guestVideo = document.createElement('video');
    guestVideo.autoplay = true;
    guestVideo.playsInline = true;
    guestVideo.muted = false; // Don't mute - we want audio for dashboard preview
    guestVideoRef.current = guestVideo;

    try {
      await guestStreamer.startViewingWithElement(
        guestVideo,
        async () => {
          console.log('✅ Connected to guest stream:', guestUsernameParam);

          // Set state first to render the video element
          setGuestActive(true);
          setGuestUsername(guestUsernameParam);
          setGuestRoomName(guestRoomNameParam);
          setGuestPipControlsVisible(true);
          setGuestAudioMuted(false);

          // Then set the display video srcObject after a small delay for React to render
          setTimeout(() => {
            if (guestDisplayVideoRef.current && guestVideo.srcObject) {
              guestDisplayVideoRef.current.srcObject = guestVideo.srcObject;
              guestDisplayVideoRef.current.muted = false; // Audio plays on dashboard
              guestDisplayVideoRef.current.play().catch(err => console.log('Display video play error:', err));
            }
          }, 100);

          // Mix guest audio into the broadcast for viewers
          setTimeout(async () => {
            await mixGuestAudioIntoBroadcast();
          }, 300);

          // Start guest composite for broadcast (only if not screen sharing)
          // Screen share already handles guest PiP in its own composite
          if (!screenSharing) {
            // Wait a bit for video to stabilize
            // Pass roomName and username directly to avoid async state issues
            setTimeout(async () => {
              await startGuestComposite(guestRoomNameParam, guestUsernameParam);
            }, 500);
          }

          // Auto-hide controls after 3 seconds
          guestPipControlsTimeoutRef.current = setTimeout(() => {
            setGuestPipControlsVisible(false);
          }, 3000);

          // Clear pending invite
          setPendingInvite(null);
          if (inviteTimeoutRef.current) {
            clearTimeout(inviteTimeoutRef.current);
          }
        },
        undefined,
        { muteAudio: false } // Don't mute - we need audio
      );
    } catch (error) {
      console.error('Failed to connect to guest stream:', error);
      guestLivekitRef.current = null;
      guestVideoRef.current = null;
    }
  };

  // Accept the invite via API
  const acceptInvite = async () => {
    if (!incomingInvite || !currentRoomName) return;

    console.log('✅ Accepting invite from:', incomingInvite.fromUsername);

    try {
      const response = await fetch('/api/stream/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userData?.username,
          action: 'accept',
          accepterRoomName: currentRoomName,
        }),
      });

      if (response.ok) {
        console.log('✅ Invite acceptance sent');
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }

    // Clear the notification
    setIncomingInvite(null);
  };

  // Decline the invite via API
  const declineInvite = async () => {
    if (!incomingInvite) return;

    console.log('❌ Declining invite from:', incomingInvite.fromUsername);

    try {
      await fetch('/api/stream/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userData?.username,
          action: 'decline',
        }),
      });
    } catch (error) {
      console.error('Failed to decline invite:', error);
    }

    setIncomingInvite(null);
  };

  // Mix guest audio into the broadcast stream for viewers
  const mixGuestAudioIntoBroadcast = async () => {
    if (!guestVideoRef.current || !streamRef.current || !livekitStreamerRef.current) {
      console.log('Cannot mix guest audio - missing refs');
      return;
    }

    const guestStream = guestVideoRef.current.srcObject as MediaStream;
    if (!guestStream) {
      console.log('No guest stream available for audio mixing');
      return;
    }

    const guestAudioTrack = guestStream.getAudioTracks()[0];
    const micAudioTrack = streamRef.current.getAudioTracks()[0];

    if (!guestAudioTrack) {
      console.log('Guest stream has no audio track');
      return;
    }

    console.log('Mixing guest audio into broadcast...');
    console.log('Guest audio track:', guestAudioTrack.label, 'enabled:', guestAudioTrack.enabled);
    console.log('Mic audio track:', micAudioTrack?.label, 'enabled:', micAudioTrack?.enabled);

    // Create audio context for mixing
    const audioContext = new AudioContext();
    guestAudioContextRef.current = audioContext;
    const destination = audioContext.createMediaStreamDestination();
    guestAudioDestinationRef.current = destination;

    // Add guest audio
    const guestAudioStream = new MediaStream([guestAudioTrack]);
    const guestSource = audioContext.createMediaStreamSource(guestAudioStream);
    guestSource.connect(destination);
    console.log('Added guest audio to mix');

    // Add broadcaster's microphone audio if available
    if (micAudioTrack) {
      const micStream = new MediaStream([micAudioTrack]);
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);
      console.log('Added broadcaster mic to mix');
    }

    // Replace audio track in LiveKit with mixed audio
    const mixedAudioTrack = destination.stream.getAudioTracks()[0];
    if (mixedAudioTrack) {
      await livekitStreamerRef.current.replaceAudioTrack(mixedAudioTrack);
      console.log('✅ Mixed audio (broadcaster + guest) published to LiveKit');
    }
  };

  // Toggle guest audio mute (for dashboard preview only)
  const toggleGuestAudioMute = () => {
    if (guestDisplayVideoRef.current) {
      const newMuted = !guestAudioMuted;
      guestDisplayVideoRef.current.muted = newMuted;
      setGuestAudioMuted(newMuted);
      console.log('Guest audio muted:', newMuted);
    }
  };

  // Remove guest PiP from stream
  const handleRemoveGuest = async () => {
    console.log('Removing guest from stream');

    // Stop guest composite and revert to camera (only if not screen sharing)
    if (!screenSharing) {
      await stopGuestComposite();
    }

    // Clean up audio mixing and restore original mic audio
    if (guestAudioContextRef.current) {
      guestAudioContextRef.current.close();
      guestAudioContextRef.current = null;
    }
    guestAudioDestinationRef.current = null;

    // Restore original microphone audio to LiveKit
    if (livekitStreamerRef.current && streamRef.current) {
      const micAudioTrack = streamRef.current.getAudioTracks()[0];
      if (micAudioTrack) {
        await livekitStreamerRef.current.replaceAudioTrack(micAudioTrack);
        console.log('✅ Restored original mic audio');
      }
    }

    if (guestLivekitRef.current) {
      guestLivekitRef.current.close();
      guestLivekitRef.current = null;
    }

    if (guestVideoRef.current) {
      guestVideoRef.current.srcObject = null;
      guestVideoRef.current = null;
    }

    if (guestDisplayVideoRef.current) {
      guestDisplayVideoRef.current.srcObject = null;
    }

    setGuestActive(false);
    setGuestUsername(null);
    setGuestRoomName(null);
    setGuestAudioMuted(false);
  };

  // Capture and upload thumbnail from video element
  const captureThumbnail = async () => {
    const roomName = currentRoomNameRef.current;
    if (!videoRef.current || !roomName) {
      console.log('Cannot capture thumbnail - videoRef:', !!videoRef.current, 'roomName:', roomName);
      return;
    }

    try {
      const video = videoRef.current;
      // Make sure video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('Video has no dimensions yet, skipping thumbnail capture');
        return;
      }

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = 320; // Thumbnail size
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

      // Upload to API - use roomName as the key (works for both token and user-based streams)
      const response = await fetch('/api/stream/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: roomName,
          thumbnail
        })
      });

      if (response.ok) {
        console.log('✅ Thumbnail uploaded for:', roomName);
      } else {
        console.error('❌ Failed to upload thumbnail:', response.status);
      }
    } catch (error) {
      console.error('Failed to capture thumbnail:', error);
    }
  };

  // Start thumbnail capture interval when live
  const startThumbnailCapture = () => {
    // Capture immediately
    setTimeout(captureThumbnail, 1000); // Small delay to ensure video is playing

    // Then capture every 10 seconds
    thumbnailIntervalRef.current = setInterval(captureThumbnail, 10000);
  };

  // Stop thumbnail capture and delete thumbnail
  const stopThumbnailCapture = async (roomName?: string | null) => {
    if (thumbnailIntervalRef.current) {
      clearInterval(thumbnailIntervalRef.current);
      thumbnailIntervalRef.current = null;
    }

    // Delete thumbnail when stream ends - use provided roomName or ref
    const thumbnailKey = roomName || currentRoomNameRef.current;
    if (thumbnailKey) {
      try {
        await fetch('/api/stream/thumbnail', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: thumbnailKey })
        });
        console.log('Thumbnail deleted for:', thumbnailKey);
      } catch (error) {
        console.error('Failed to delete thumbnail:', error);
      }
    }
  };

  // TikTok-style mobile layout with full-screen video and overlays
  // Desktop keeps traditional 3-column layout

  // Show loading state while data loads
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-[#0e0e10] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      {/* ===== INCOMING INVITE NOTIFICATION ===== */}
      {incomingInvite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-purple-500/50 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl shadow-purple-500/20 animate-in fade-in zoom-in duration-300">
            {/* Header with pulsing live indicator */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="relative">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
              </div>
              <span className="text-sm font-medium text-red-400">LIVE INVITE</span>
            </div>

            {/* Avatar and message */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 mb-3">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#0e0e10]">
                  {incomingInvite.fromAvatar ? (
                    <img
                      src={incomingInvite.fromAvatar}
                      alt={incomingInvite.fromUsername}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white">
                      {incomingInvite.fromUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {incomingInvite.fromUsername}
              </h3>
              <p className="text-gray-400 text-sm">
                invites you to join their broadcast
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={declineInvite}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
              >
                Decline
              </button>
              <button
                onClick={acceptInvite}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium transition-all shadow-lg shadow-purple-500/30"
              >
                Accept
              </button>
            </div>

            {/* Auto-dismiss timer */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">Auto-dismisses in 15 seconds</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== MOBILE LAYOUT (< lg) - Full screen video with overlays ===== */}
      <div className="lg:hidden fixed inset-0 bg-black z-[60]">
        {/* Camera Preview (before going live) */}
        {!isLive && (
          <video
            ref={previewVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* Live Video (when streaming) */}
        {isLive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Offline State - Camera preview with POST/LIVE modes */}
        {!isLive && (
          <>
            {/* Captured image overlay (for PHOTO mode) */}
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured"
                className="absolute inset-0 w-full h-full object-cover z-10"
              />
            )}

            {/* Captured video overlay (for VIDEO mode) */}
            {capturedVideoUrl && (
              <video
                src={capturedVideoUrl}
                autoPlay
                loop
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover z-10"
                style={{ transform: 'scaleX(-1)' }}
              />
            )}

            {/* Semi-transparent overlay for LIVE mode */}
            {cameraMode === 'LIVE' && !capturedImage && !capturedVideoUrl && (
              <div className="absolute inset-0 bg-black/40" />
            )}

            {/* Top bar with close button */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-safe">
              <Link href="/" className="p-2">
                <X className="h-7 w-7 text-white" />
              </Link>
              <div className="flex items-center gap-4">
                {!capturedImage && !capturedVideoUrl && (
                  <button className="p-2">
                    <Settings className="h-6 w-6 text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* LIVE Mode - Category selector in center */}
            {cameraMode === 'LIVE' && !capturedImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="text-3xl font-bold text-white tracking-wider mb-2">OFFLINE</div>
                <p className="text-gray-300 text-base mb-6">Select a category</p>

                {/* Category Selection */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setStreamCategory('IRL')}
                    className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl transition-all ${
                      streamCategory === 'IRL'
                        ? 'bg-purple-600 ring-2 ring-purple-400'
                        : 'bg-gray-800/80'
                    }`}
                  >
                    <Camera className="w-7 h-7 text-white mb-1" />
                    <span className="text-white text-xs font-medium">IRL</span>
                  </button>
                  <button
                    onClick={() => setStreamCategory('Gaming')}
                    className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl transition-all ${
                      streamCategory === 'Gaming'
                        ? 'bg-purple-600 ring-2 ring-purple-400'
                        : 'bg-gray-800/80'
                    }`}
                  >
                    <Gamepad2 className="w-7 h-7 text-white mb-1" />
                    <span className="text-white text-xs font-medium">Gaming</span>
                  </button>
                  <button
                    onClick={() => setStreamCategory('Music')}
                    className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl transition-all ${
                      streamCategory === 'Music'
                        ? 'bg-purple-600 ring-2 ring-purple-400'
                        : 'bg-gray-800/80'
                    }`}
                  >
                    <Music className="w-7 h-7 text-white mb-1" />
                    <span className="text-white text-xs font-medium">Music</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
              {capturedImage ? (
                /* Photo Post Preview Controls */
                <div className="p-4 pb-12 space-y-4">
                  {/* Caption Input */}
                  <input
                    type="text"
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 rounded-xl border border-white/20 focus:outline-none focus:border-purple-500"
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={retakePhoto}
                      className="flex-1 py-3 text-white font-semibold rounded-xl bg-white/20"
                    >
                      Retake
                    </button>
                    <button
                      onClick={postPhoto}
                      disabled={isPosting}
                      className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                    >
                      {isPosting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Zap className="h-5 w-5" />
                          Post
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : capturedVideoUrl ? (
                /* Video Post Preview Controls */
                <div className="p-4 pb-12 space-y-4">
                  {/* Caption Input */}
                  <input
                    type="text"
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 rounded-xl border border-white/20 focus:outline-none focus:border-purple-500"
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={retakeVideo}
                      className="flex-1 py-3 text-white font-semibold rounded-xl bg-white/20"
                    >
                      Retake
                    </button>
                    <button
                      onClick={postVideo}
                      disabled={isPosting}
                      className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                    >
                      {isPosting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Zap className="h-5 w-5" />
                          Post
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Camera Controls */
                <div className="p-4 pb-12">
                  {/* Recording time indicator */}
                  {isRecording && (
                    <div className="flex items-center justify-center mb-4">
                      <div className="flex items-center gap-2 bg-red-500/80 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-white font-semibold text-sm">{formatRecordingTime(recordingTime)}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Button - changes based on mode */}
                  <div className="flex items-center justify-center mb-6">
                    {cameraMode === 'VIDEO' ? (
                      /* Record Button for VIDEO */
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                          isRecording
                            ? 'border-red-500 bg-red-500/20'
                            : 'border-red-500 bg-transparent'
                        }`}
                      >
                        {isRecording ? (
                          <div className="w-8 h-8 rounded-sm bg-red-500" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-red-500" />
                        )}
                      </button>
                    ) : cameraMode === 'PHOTO' ? (
                      /* Capture Button for PHOTO */
                      <button
                        onClick={capturePhoto}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-white" />
                      </button>
                    ) : (
                      /* Go Live Button for LIVE - only enabled when category is selected */
                      <button
                        onClick={handleGoLive}
                        disabled={!streamCategory}
                        className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                          streamCategory
                            ? 'border-red-500 bg-red-500/20'
                            : 'border-gray-500 bg-gray-500/20 opacity-50'
                        }`}
                      >
                        <Radio className={`w-10 h-10 ${streamCategory ? 'text-red-500' : 'text-gray-500'}`} />
                      </button>
                    )}
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setCameraMode('VIDEO')}
                      className={`px-4 py-2 text-base font-semibold transition-colors ${
                        cameraMode === 'VIDEO' ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      VIDEO
                    </button>
                    <button
                      onClick={() => setCameraMode('PHOTO')}
                      className={`px-4 py-2 text-base font-semibold transition-colors ${
                        cameraMode === 'PHOTO' ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      PHOTO
                    </button>
                    <button
                      onClick={() => setCameraMode('LIVE')}
                      className={`px-4 py-2 text-base font-semibold transition-colors ${
                        cameraMode === 'LIVE' ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      LIVE
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Gradient overlays for better text readability */}
        {isLive && (
          <>
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          </>
        )}

        {/* Top Stats Bar - Floating overlay */}
        {isLive && (
          <div className="absolute top-0 left-0 right-0 z-10 px-3 py-2 pt-safe">
            <div className="flex items-center justify-between">
              {/* Left: X button to exit + Creator info + Live badge */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEndStream}
                  className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
                <Avatar className="h-8 w-8 border-2 border-red-500">
                  <AvatarImage src={user.image || userData?.avatar} />
                  <AvatarFallback className="bg-purple-600 text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold">{username}</div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-600 text-[10px] px-1.5 py-0">LIVE</Badge>
                    <span className="text-xs text-gray-300">{formatTime(sessionTime)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Stats */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-black/50 rounded-full px-2 py-1">
                  <Eye className="h-3 w-3 text-white" />
                  <span className="text-xs font-medium">{viewerCount}</span>
                </div>
                <div className="flex items-center gap-1 bg-black/50 rounded-full px-2 py-1">
                  <Users className="h-3 w-3 text-white" />
                  <span className="text-xs font-medium">{followerCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Side Controls - Floating vertical buttons */}
        {isLive && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
            <button
              onClick={toggleCamera}
              className={`w-11 h-11 rounded-full flex items-center justify-center ${
                cameraEnabled ? 'bg-white/20' : 'bg-red-500/80'
              }`}
            >
              {cameraEnabled ? (
                <Video className="h-5 w-5 text-white" />
              ) : (
                <VideoOff className="h-5 w-5 text-white" />
              )}
            </button>
            <button
              onClick={toggleMicrophone}
              className={`w-11 h-11 rounded-full flex items-center justify-center ${
                microphoneEnabled ? 'bg-white/20' : 'bg-red-500/80'
              }`}
            >
              {microphoneEnabled ? (
                <Mic className="h-5 w-5 text-white" />
              ) : (
                <MicOff className="h-5 w-5 text-white" />
              )}
            </button>
            <button
              onClick={handleEndStream}
              className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center"
            >
              <Square className="h-5 w-5 text-white" />
            </button>
          </div>
        )}

        {/* Activity Notifications - Floating on left side */}
        {isLive && activityEvents.length > 0 && (
          <div className="absolute left-3 top-20 z-10 w-48">
            <div className="space-y-2">
              {[...activityEvents].slice(-3).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 animate-in slide-in-from-left duration-300"
                >
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarImage src={event.avatar} />
                    <AvatarFallback className="text-[10px] bg-gray-700">
                      {event.user.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1 min-w-0">
                    {event.type === 'like' && <Heart className="h-3 w-3 text-red-500 fill-red-500 flex-shrink-0" />}
                    {event.type === 'follow' && <UserPlus className="h-3 w-3 text-purple-400 flex-shrink-0" />}
                    {event.type === 'tip' && <DollarSign className="h-3 w-3 text-green-400 flex-shrink-0" />}
                    <span className="text-xs text-white truncate">{event.user}</span>
                    {event.type === 'tip' && (
                      <span className="text-xs text-green-400 font-medium flex-shrink-0">{event.amount}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Overlay - Bottom of screen */}
        {isLive && (
          <div className="absolute bottom-0 left-0 right-14 z-10 pb-safe">
            {/* Chat Messages - Scrollable with fade */}
            <div className="px-3 mb-2 max-h-48 overflow-y-auto">
              <div className="space-y-1.5">
                {chatMessages.slice(-8).map((msg, index) => (
                  <div
                    key={`${msg.id}-${index}`}
                    className="flex items-start gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1.5"
                  >
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={msg.avatar} />
                      <AvatarFallback className="text-[10px] bg-gray-700">
                        {msg.user.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-semibold ${msg.isCreator ? 'text-purple-400' : 'text-gray-300'}`}>
                        {msg.user}
                        {msg.isCreator && <span className="text-yellow-500 ml-0.5">★</span>}
                      </span>
                      {msg.tip && (
                        <span className="text-[10px] bg-green-600 text-white px-1 py-0.5 rounded ml-1">
                          {msg.tip} SOL
                        </span>
                      )}
                      <p className="text-xs text-white break-words">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="px-3 pb-3">
              <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Say something..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-10 h-10 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 rounded-full flex items-center justify-center"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ===== DESKTOP LAYOUT (>= lg) - Traditional 3-column layout ===== */}
      <div className="hidden lg:block">
        {/* Main 3-Column Layout */}
        <div className="flex max-w-[1920px] mx-auto">
          {/* Left Column - Friends List + Activity Feed */}
          <div className="bg-[#18181b] border-r border-gray-800 flex flex-col h-screen w-[280px] flex-shrink-0">
            {/* Friends List Section - At Top */}
            <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold">Friends</h2>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="p-3 max-h-[200px] overflow-y-auto border-b border-gray-800">
              {friendsLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 text-gray-600 animate-spin" />
                  <p className="text-xs text-gray-400">Loading friends...</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-4">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-xs text-gray-400">No friends yet</p>
                  <p className="text-xs text-gray-500 mt-1">Follow creators to see them here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#0e0e10] transition-colors"
                    >
                      <Link
                        href={friend.isLive ? `/live/${friend.liveStream?.roomName}` : `/profile/${friend.username}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="relative">
                          <Avatar className={`h-10 w-10 ${friend.isLive ? 'ring-2 ring-red-500' : friend.isOnline ? 'ring-2 ring-green-500' : ''}`}>
                            <AvatarImage src={friend.avatar || undefined} />
                            <AvatarFallback className="text-sm bg-gray-700">
                              {(friend.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {friend.isLive ? (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#18181b]" />
                          ) : friend.isOnline ? (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#18181b]" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium truncate">{friend.displayName || friend.username}</span>
                            {friend.isVerified && (
                              <svg className="h-3 w-3 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          {friend.isLive ? (
                            <p className="text-xs text-red-400">Live now</p>
                          ) : friend.isOnline ? (
                            <p className="text-xs text-green-400">Online</p>
                          ) : (
                            <p className="text-xs text-gray-500">Offline</p>
                          )}
                        </div>
                      </Link>
                      {/* Invite button for live friends when broadcaster is also live */}
                      {isLive && friend.isLive && friend.liveStream && !guestActive && (
                        pendingInvite?.toRoomName === friend.liveStream.roomName ? (
                          <span className="flex-shrink-0 px-2 py-1 text-xs bg-yellow-600/50 rounded text-yellow-300 animate-pulse">
                            Pending...
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleInviteFriend(friend);
                            }}
                            className="flex-shrink-0 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white"
                          >
                            Invite
                          </button>
                        )
                      )}
                      {/* Show "On Stream" badge and mute button if this friend is the current guest */}
                      {guestActive && guestRoomName === friend.liveStream?.roomName && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="px-2 py-1 text-xs bg-green-600 rounded text-white">
                            On Stream
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleGuestAudioMute();
                            }}
                            className={`p-1 rounded ${guestAudioMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                            title={guestAudioMuted ? 'Unmute guest audio' : 'Mute guest audio'}
                          >
                            {guestAudioMuted ? (
                              <VolumeX className="h-3.5 w-3.5 text-white" />
                            ) : (
                              <Volume2 className="h-3.5 w-3.5 text-white" />
                            )}
                          </button>
                        </div>
                      )}
                      {friend.isLive && friend.liveStream && !guestActive && !isLive && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Eye className="h-3 w-3" />
                          {friend.liveStream.viewerCount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Feed Section */}
            <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold">Activity Feed</h2>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div ref={activityContainerRef} className="p-4 flex-1 overflow-y-auto min-h-0">
              {activityEvents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-lg font-bold mb-2">It&apos;s quiet. Too quiet...</div>
                  <p className="text-xs text-gray-400">
                    We&apos;ll show your new follows, tips, and activity here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...activityEvents].reverse().slice(0, 10).map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 bg-[#0e0e10] rounded-lg">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={event.avatar} />
                        <AvatarFallback className="text-xs bg-gray-700">
                          {event.user.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {event.type === 'like' && <Heart className="h-4 w-4 text-red-500 fill-red-500" />}
                          {event.type === 'follow' && <UserPlus className="h-4 w-4 text-purple-500" />}
                          {event.type === 'tip' && <DollarSign className="h-4 w-4 text-green-500" />}
                          <span className="text-sm font-medium truncate">{event.user}</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {event.type === 'like' && 'liked your stream'}
                          {event.type === 'follow' && 'started following you'}
                          {event.type === 'tip' && `tipped ${event.amount} SOL`}
                          {event.type === 'join' && 'joined the stream'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center Column - Video Preview */}
          <div className="flex-1 bg-[#0e0e10] flex flex-col h-screen">
            {/* Video Preview */}
            <div
              className="relative bg-black aspect-video overflow-hidden flex-shrink-0"
              onMouseMove={() => {
                if (screenSharing && !pipControlsVisible) {
                  setPipControlsVisible(true);
                  if (pipControlsTimeoutRef.current) {
                    clearTimeout(pipControlsTimeoutRef.current);
                  }
                  pipControlsTimeoutRef.current = setTimeout(() => {
                    setPipControlsVisible(false);
                  }, 3000);
                }
              }}
            >
              {/* Desktop video - shows screen share when active, camera otherwise */}
              <video
                ref={desktopVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isLive ? '' : 'hidden'}`}
              />
              {/* Draggable/Resizable PiP control overlay when screen sharing and camera on */}
              {isLive && screenSharing && cameraEnabled && (
                <div
                  className={`absolute border-2 border-dashed border-purple-400 bg-transparent cursor-move transition-opacity duration-300 ${pipControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  style={{
                    left: `${(pipPosition.x / 1920) * 100}%`,
                    top: `${(pipPosition.y / 1080) * 100}%`,
                    width: `${(pipSize.width / 1920) * 100}%`,
                    height: `${(pipSize.height / 1080) * 100}%`,
                  }}
                  onMouseEnter={() => {
                    if (pipControlsTimeoutRef.current) {
                      clearTimeout(pipControlsTimeoutRef.current);
                    }
                    setPipControlsVisible(true);
                  }}
                  onMouseLeave={() => {
                    pipControlsTimeoutRef.current = setTimeout(() => {
                      setPipControlsVisible(false);
                    }, 2000);
                  }}
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
                    e.preventDefault();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startPosX = pipPosition.x;
                    const startPosY = pipPosition.y;
                    const container = e.currentTarget.parentElement;
                    const containerRect = container?.getBoundingClientRect();

                    const onMouseMove = (moveEvent: MouseEvent) => {
                      if (!containerRect) return;
                      const deltaX = moveEvent.clientX - startX;
                      const deltaY = moveEvent.clientY - startY;
                      const scaleX = 1920 / containerRect.width;
                      const scaleY = 1080 / containerRect.height;

                      const newX = Math.max(0, Math.min(1920 - pipSize.width, startPosX + deltaX * scaleX));
                      const newY = Math.max(0, Math.min(1080 - pipSize.height, startPosY + deltaY * scaleY));

                      setPipPosition({ x: newX, y: newY });
                      pipPositionRef.current = { x: newX, y: newY };
                    };

                    const onMouseUp = () => {
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }}
                >
                  {/* Drag hint */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/70 text-xs font-medium pointer-events-none bg-black/50 px-2 py-1 rounded">
                    Drag to move
                  </div>
                  {/* Resize handle - bottom right corner */}
                  <div
                    className="resize-handle absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 cursor-se-resize rounded-sm flex items-center justify-center"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startWidth = pipSize.width;
                      const startHeight = pipSize.height;
                      const container = e.currentTarget.parentElement?.parentElement;
                      const containerRect = container?.getBoundingClientRect();

                      const onMouseMove = (moveEvent: MouseEvent) => {
                        if (!containerRect) return;
                        const deltaX = moveEvent.clientX - startX;
                        const scaleX = 1920 / containerRect.width;

                        // Maintain 4:3 aspect ratio
                        const newWidth = Math.max(240, Math.min(960, startWidth + deltaX * scaleX));
                        const newHeight = newWidth * 0.75; // 4:3 aspect ratio

                        setPipSize({ width: newWidth, height: newHeight });
                        pipSizeRef.current = { width: newWidth, height: newHeight };
                      };

                      const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                      };

                      document.addEventListener('mousemove', onMouseMove);
                      document.addEventListener('mouseup', onMouseUp);
                    }}
                  >
                    {/* Resize icon */}
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M21 21L12 12M21 21H15M21 21V15" />
                    </svg>
                  </div>
                </div>
              )}
              {/* Guest PiP Overlay - shows when a guest is on stream */}
              {isLive && guestActive && guestVideoRef.current && (
                <div
                  className={`absolute border-2 border-dashed border-green-400 bg-black/50 cursor-move transition-opacity duration-300 overflow-hidden rounded-lg ${guestPipControlsVisible ? 'opacity-100' : 'opacity-80'}`}
                  style={{
                    left: `${(guestPipPosition.x / 1920) * 100}%`,
                    top: `${(guestPipPosition.y / 1080) * 100}%`,
                    width: `${(guestPipSize.width / 1920) * 100}%`,
                    height: `${(guestPipSize.height / 1080) * 100}%`,
                  }}
                  onMouseEnter={() => {
                    if (guestPipControlsTimeoutRef.current) {
                      clearTimeout(guestPipControlsTimeoutRef.current);
                    }
                    setGuestPipControlsVisible(true);
                  }}
                  onMouseLeave={() => {
                    guestPipControlsTimeoutRef.current = setTimeout(() => {
                      setGuestPipControlsVisible(false);
                    }, 2000);
                  }}
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).classList.contains('resize-handle') || (e.target as HTMLElement).classList.contains('remove-btn')) return;
                    e.preventDefault();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startPosX = guestPipPosition.x;
                    const startPosY = guestPipPosition.y;
                    const container = e.currentTarget.parentElement;
                    const containerRect = container?.getBoundingClientRect();

                    const onMouseMove = (moveEvent: MouseEvent) => {
                      if (!containerRect) return;
                      const deltaX = moveEvent.clientX - startX;
                      const deltaY = moveEvent.clientY - startY;
                      const scaleX = 1920 / containerRect.width;
                      const scaleY = 1080 / containerRect.height;

                      const newX = Math.max(0, Math.min(1920 - guestPipSize.width, startPosX + deltaX * scaleX));
                      const newY = Math.max(0, Math.min(1080 - guestPipSize.height, startPosY + deltaY * scaleY));

                      setGuestPipPosition({ x: newX, y: newY });
                      guestPipPositionRef.current = { x: newX, y: newY };
                    };

                    const onMouseUp = () => {
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }}
                >
                  {/* Guest video stream */}
                  <video
                    ref={guestDisplayVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Guest username label */}
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                    {guestUsername}
                  </div>
                  {/* Remove guest button */}
                  <button
                    className={`remove-btn absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-opacity ${guestPipControlsVisible ? 'opacity-100' : 'opacity-0'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveGuest();
                    }}
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                  {/* Resize handle - bottom right corner */}
                  <div
                    className={`resize-handle absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 cursor-se-resize rounded-sm flex items-center justify-center transition-opacity ${guestPipControlsVisible ? 'opacity-100' : 'opacity-0'}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startWidth = guestPipSize.width;
                      const container = e.currentTarget.parentElement?.parentElement;
                      const containerRect = container?.getBoundingClientRect();

                      const onMouseMove = (moveEvent: MouseEvent) => {
                        if (!containerRect) return;
                        const deltaX = moveEvent.clientX - startX;
                        const scaleX = 1920 / containerRect.width;

                        // Maintain 9:16 portrait aspect ratio
                        const newWidth = Math.max(150, Math.min(500, startWidth + deltaX * scaleX));
                        const newHeight = newWidth * (16 / 9); // 9:16 portrait

                        setGuestPipSize({ width: newWidth, height: newHeight });
                        guestPipSizeRef.current = { width: newWidth, height: newHeight };
                      };

                      const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                      };

                      document.addEventListener('mousemove', onMouseMove);
                      document.addEventListener('mouseup', onMouseUp);
                    }}
                  >
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M21 21L12 12M21 21H15M21 21V15" />
                    </svg>
                  </div>
                </div>
              )}
              {!isLive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-gray-600 mb-6">OFFLINE</div>

                    {/* Category Selection */}
                    <div className="mb-6">
                      <p className="text-gray-400 text-sm mb-3">Select a category</p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setStreamCategory('IRL')}
                          className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl transition-all ${
                            streamCategory === 'IRL'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          <Camera className="h-6 w-6" />
                          <span className="text-sm font-medium">IRL</span>
                        </button>
                        <button
                          onClick={() => setStreamCategory('Gaming')}
                          className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl transition-all ${
                            streamCategory === 'Gaming'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          <Gamepad2 className="h-6 w-6" />
                          <span className="text-sm font-medium">Gaming</span>
                        </button>
                        <button
                          onClick={() => setStreamCategory('Music')}
                          className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl transition-all ${
                            streamCategory === 'Music'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          <Music className="h-6 w-6" />
                          <span className="text-sm font-medium">Music</span>
                        </button>
                      </div>
                    </div>

                    {/* Microphone Selector */}
                    {audioDevices.length > 0 && (
                      <div className="mb-4 w-full max-w-xs">
                        <label className="block text-xs text-gray-400 mb-1">Microphone</label>
                        <select
                          value={selectedAudioDevice}
                          onChange={(e) => switchMicrophone(e.target.value)}
                          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-purple-500"
                        >
                          {audioDevices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <Button
                      onClick={handleGoLive}
                      disabled={!streamCategory}
                      data-go-live-button
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Radio className="h-4 w-4 mr-2" />
                      Go Live
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Stream Info Below Video */}
            <div className="p-4 bg-[#18181b] flex-1 overflow-y-auto">
              {/* Stream Controls */}
              {isLive && (
                <div className="mb-4 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleCamera}
                    className={`${cameraEnabled ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}`}
                  >
                    {cameraEnabled ? <Video className="h-4 w-4 mr-1" /> : <VideoOff className="h-4 w-4 mr-1" />}
                    {cameraEnabled ? 'Camera On' : 'Camera Off'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMicrophone}
                    className={`${microphoneEnabled ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}`}
                  >
                    {microphoneEnabled ? <Mic className="h-4 w-4 mr-1" /> : <MicOff className="h-4 w-4 mr-1" />}
                    {microphoneEnabled ? 'Mic On' : 'Mic Off'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleScreenShare}
                    className={`${screenSharing ? 'text-purple-400 border-purple-400' : 'text-gray-400 border-gray-400'}`}
                  >
                    {screenSharing ? <Monitor className="h-4 w-4 mr-1" /> : <MonitorOff className="h-4 w-4 mr-1" />}
                    {screenSharing ? 'Sharing' : 'Share Screen'}
                  </Button>

                  {/* Desktop Audio Button - only show when screen sharing */}
                  {screenSharing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleDesktopAudio}
                      className={`${desktopAudioEnabled ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-gray-400'}`}
                    >
                      {desktopAudioEnabled ? <Volume2 className="h-4 w-4 mr-1" /> : <VolumeX className="h-4 w-4 mr-1" />}
                      {desktopAudioEnabled ? 'Desktop Audio' : 'Desktop Muted'}
                    </Button>
                  )}

                  {/* Clip Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isClipping ? stopClip : startClip}
                    className={`${isClipping ? 'text-red-400 border-red-400 animate-pulse' : 'text-orange-400 border-orange-400'}`}
                  >
                    {isClipping ? (
                      <>
                        <CircleDot className="h-4 w-4 mr-1" />
                        {formatRecordingTime(clipTime)}
                      </>
                    ) : (
                      <>
                        <Scissors className="h-4 w-4 mr-1" />
                        Clip
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleEndStream}
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop Stream
                  </Button>
                </div>
              )}

              {/* Microphone Selector during live */}
              {isLive && audioDevices.length > 1 && (
                <div className="mb-4 flex items-center justify-center gap-2">
                  <Mic className="h-4 w-4 text-gray-400" />
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => switchMicrophone(e.target.value)}
                    className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 border border-gray-700 focus:outline-none focus:border-purple-500"
                  >
                    {audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Mic ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Profile Card + Stats Bar */}
              <div className="flex items-center justify-center gap-6">
                {/* Profile Card */}
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.image || userData?.avatar} />
                    <AvatarFallback className="bg-purple-600">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{username}</div>
                    <Badge className={isLive ? "bg-red-600" : "bg-gray-600"}>
                      {isLive ? "LIVE" : "OFFLINE"}
                    </Badge>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-10 w-px bg-gray-700" />

                {/* Stats Bar - Order: Session > Viewers > Followers > SOL > Rank */}
                <div className="flex items-center space-x-6 text-sm">
                  {/* Session - How long streaming */}
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <div>
                      <div className="text-lg font-bold">{formatTime(sessionTime)}</div>
                      <div className="text-xs text-gray-400">Session</div>
                    </div>
                  </div>
                  {/* Viewers - Current engagement */}
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-yellow-400" />
                    <div>
                      <div className="text-lg font-bold">{viewerCount}</div>
                      <div className="text-xs text-gray-400">Viewers</div>
                    </div>
                  </div>
                  {/* Followers - Community growth */}
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    <div>
                      <div className="text-lg font-bold">{followerCount}</div>
                      <div className="text-xs text-gray-400">Followers</div>
                    </div>
                  </div>
                  {/* Tips - Earnings */}
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-green-400" />
                    <div>
                      <div className="text-lg font-bold">0.00</div>
                      <div className="text-xs text-gray-400">Tips</div>
                    </div>
                  </div>
                  {/* Rank - Competitive standing */}
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <div>
                      <div className="text-lg font-bold">-</div>
                      <div className="text-xs text-gray-400">Rank</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remote Control QR Code */}
              {isLive && currentRoomName && (
                <div className="mt-4 flex items-center justify-center gap-4 p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-white p-2 rounded-lg">
                    <QRCodeSVG
                      value={typeof window !== 'undefined'
                        ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                          ? `https://creator-fun-ruby.vercel.app/remote?room=${encodeURIComponent(currentRoomName)}`
                          : `${window.location.origin}/remote?room=${encodeURIComponent(currentRoomName)}`)
                        : '/remote'}
                      size={80}
                      level="M"
                    />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Smartphone className="h-4 w-4 text-purple-400" />
                      Remote Control
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Scan with your phone to control<br />your stream remotely
                    </p>
                    {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                      <p className="text-xs text-yellow-400 mt-1">
                        Using production URL for QR
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Chat */}
          <div className="bg-[#18181b] border-l border-gray-800 flex flex-col h-screen w-[300px] flex-shrink-0">
            <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold">My Chat</h2>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div ref={chatContainerRef} className="p-4 flex-1 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                  <p>Welcome to the chat room!</p>
                  {!isLive && <p className="text-xs mt-2">Chat will be active when streaming</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  {chatMessages.slice(-20).map((msg, index) => (
                    <div key={`${msg.id}-${index}`} className="flex items-start gap-2 text-sm">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={msg.avatar} />
                        <AvatarFallback className="text-xs bg-gray-700">
                          {msg.user.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className={`font-semibold ${msg.isCreator ? 'text-purple-400' : 'text-gray-400'}`}>
                          {msg.user}
                          {msg.isCreator && <span className="text-yellow-500 ml-1">★</span>}
                        </span>
                        {msg.tip && (
                          <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded ml-2">
                            {msg.tip} SOL
                          </span>
                        )}
                        <p className="text-white break-words">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 p-3 mt-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Send a message"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-[#0e0e10] border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                  disabled={!isLive}
                />
                <button
                  type="submit"
                  disabled={!isLive || !chatInput.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium"
                >
                  Chat
                </button>
              </form>
            </div>
          </div>
        </div>
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

            <h2 className="text-xl font-bold text-white mb-4">Post Your Clip</h2>

            {/* Video Preview */}
            {clipVideoUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-black">
                <video
                  src={clipVideoUrl}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  loop
                  muted
                />
              </div>
            )}

            {/* Caption Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Caption</label>
              <input
                type="text"
                value={clipCaption}
                onChange={(e) => setClipCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full bg-[#0e0e10] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Post Type Selection */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Post Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setClipPostType('free')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    clipPostType === 'free'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#0e0e10] text-gray-400 border border-gray-700 hover:border-purple-500'
                  }`}
                >
                  Free
                </button>
                <button
                  onClick={() => setClipPostType('paid')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    clipPostType === 'paid'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#0e0e10] text-gray-400 border border-gray-700 hover:border-purple-500'
                  }`}
                >
                  Paid
                </button>
              </div>
            </div>

            {/* Price Input (only for paid) */}
            {clipPostType === 'paid' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Price ($)</label>
                <input
                  type="number"
                  value={clipPrice}
                  onChange={(e) => setClipPrice(e.target.value)}
                  placeholder="Enter price"
                  min="1"
                  step="0.01"
                  className="w-full bg-[#0e0e10] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={cancelClip}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-400 hover:text-white"
                disabled={isPostingClip}
              >
                Cancel
              </Button>
              <Button
                onClick={postClip}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={isPostingClip || (clipPostType === 'paid' && !clipPrice)}
              >
                {isPostingClip ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Clip'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f0a15] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    }>
      <GoLiveContent />
    </Suspense>
  );
}
