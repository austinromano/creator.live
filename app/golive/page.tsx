'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import Link from 'next/link';
import { LiveKitStreamer, LiveKitChatMessage, LiveKitActivityEvent } from '@/lib/livekit-stream';
import { ChatMessage } from '@/lib/types';

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

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLive, setIsLive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const desktopVideoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const livekitStreamerRef = React.useRef<LiveKitStreamer | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const cameraEnabledRef = React.useRef(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const pipVideoRef = React.useRef<HTMLVideoElement>(null);
  const compositeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const compositeAnimationRef = React.useRef<number | null>(null);
  const mixedAudioContextRef = React.useRef<AudioContext | null>(null);
  const mixedAudioDestinationRef = React.useRef<MediaStreamAudioDestinationNode | null>(null);
  const originalMicTrackRef = React.useRef<MediaStreamTrack | null>(null);

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

  const user = session?.user as any;
  const userId = user?.id;
  const username = userData?.username || user?.name || 'User';

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
      // Clear composite animation interval
      if (compositeAnimationRef.current) {
        clearInterval(compositeAnimationRef.current);
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

  if (status === 'loading' || userLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
          <p className="text-gray-400 mt-4">Loading your creator profile...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || !userData) {
    return (
      <div className="min-h-screen bg-[#0e0e10] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

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

      // Request both video and audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true
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

        await livekitStreamerRef.current.startBroadcast(streamRef.current);
        console.log('LiveKit broadcast started for room:', roomName);

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
        audioTrack.enabled = !audioTrack.enabled;
        setMicrophoneEnabled(audioTrack.enabled);
      }
    }
  };

  const stopCompositeStream = () => {
    if (compositeAnimationRef.current) {
      clearInterval(compositeAnimationRef.current);
      compositeAnimationRef.current = null;
    }
  };

  const startCompositeStream = async (screenStream: MediaStream, cameraStream: MediaStream) => {
    // Create canvas for compositing (1080p)
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    compositeCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

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

    // Use setInterval instead of requestAnimationFrame for consistent frame rate
    // 30fps for smooth video
    const frameInterval = setInterval(() => {
      // Clear canvas first to prevent artifacts
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw screen share as background (full canvas)
      if (screenVideo.readyState >= 2 && screenVideo.videoWidth > 0) {
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
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
    }, 33); // ~30fps

    // Store interval ID for cleanup
    compositeAnimationRef.current = frameInterval as unknown as number;

    // Get stream from canvas at 30fps
    const compositeStream = canvas.captureStream(30);
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

      // Clean up audio mixing
      if (mixedAudioContextRef.current) {
        mixedAudioContextRef.current.close();
        mixedAudioContextRef.current = null;
      }

      // Restore original microphone audio
      if (originalMicTrackRef.current && livekitStreamerRef.current) {
        await livekitStreamerRef.current.replaceAudioTrack(originalMicTrackRef.current);
        console.log('Restored original microphone track');
      }

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
            frameRate: { ideal: 30 }
          },
          audio: true // Capture system audio
        });
        screenStreamRef.current = screenStream;

        // Mix system audio with microphone audio
        const screenAudioTrack = screenStream.getAudioTracks()[0];
        const micAudioTrack = streamRef.current?.getAudioTracks()[0];

        if (screenAudioTrack || micAudioTrack) {
          // Save original mic track for restoration later
          if (micAudioTrack) {
            originalMicTrackRef.current = micAudioTrack;
          }

          // Create audio context for mixing
          const audioContext = new AudioContext();
          mixedAudioContextRef.current = audioContext;
          const destination = audioContext.createMediaStreamDestination();
          mixedAudioDestinationRef.current = destination;

          // Add system audio if available
          if (screenAudioTrack) {
            const screenAudioStream = new MediaStream([screenAudioTrack]);
            const screenSource = audioContext.createMediaStreamSource(screenAudioStream);
            screenSource.connect(destination);
            console.log('Added system audio to mix');
          }

          // Add microphone audio if available and enabled
          if (micAudioTrack && microphoneEnabled) {
            const micStream = new MediaStream([micAudioTrack]);
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(destination);
            console.log('Added microphone to mix');
          }

          // Replace audio track in LiveKit with mixed audio
          const mixedAudioTrack = destination.stream.getAudioTracks()[0];
          if (mixedAudioTrack && livekitStreamerRef.current) {
            await livekitStreamerRef.current.replaceAudioTrack(mixedAudioTrack);
            console.log('Published mixed audio track');
          }
        }

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

          // Clean up audio mixing
          if (mixedAudioContextRef.current) {
            mixedAudioContextRef.current.close();
            mixedAudioContextRef.current = null;
          }

          // Restore original microphone audio
          if (originalMicTrackRef.current && livekitStreamerRef.current) {
            await livekitStreamerRef.current.replaceAudioTrack(originalMicTrackRef.current);
            console.log('Restored original microphone track');
          }

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
        {/* Full-screen Video Background - Mobile only */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${isLive ? '' : 'hidden'}`}
        />

        {/* Offline State - Full screen */}
        {!isLive && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0e0e10]">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-600 mb-6">OFFLINE</div>

              {/* Category Selection */}
              <div className="mb-6">
                <p className="text-gray-400 text-sm mb-3">Select a category</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setStreamCategory('IRL')}
                    className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all ${
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
                    className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all ${
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
                    className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all ${
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

              <Button
                onClick={handleGoLive}
                disabled={!streamCategory}
                className="bg-purple-600 hover:bg-purple-700 text-lg px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Radio className="h-5 w-5 mr-2" />
                Go Live
              </Button>
            </div>
          </div>
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

                    <Button
                      onClick={handleGoLive}
                      disabled={!streamCategory}
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
    </div>
  );
}
