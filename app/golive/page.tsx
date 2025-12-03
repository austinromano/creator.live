'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTokenStore } from '@/stores/tokenStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Creator } from '@/lib/types';
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
} from 'lucide-react';
import { LiveStreamBroadcast } from '@/components/streaming/LiveStreamBroadcast';
import { LiveKitStreamer, LiveKitChatMessage, LiveKitActivityEvent } from '@/lib/livekit-stream';
import { ChatMessage } from '@/lib/types';

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
  const { getTokenByCreator, getTokenBySymbol, updateToken, fetchTokens, initialized } = useTokenStore();
  const [isLive, setIsLive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const livekitStreamerRef = React.useRef<LiveKitStreamer | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [streamReady, setStreamReady] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);
  const [streamTitle, setStreamTitle] = useState('');
  const [userToken, setUserToken] = useState<Creator | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const thumbnailIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const currentRoomNameRef = React.useRef<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  const [activityEvents, setActivityEvents] = useState<LiveKitActivityEvent[]>([]);
  const activityContainerRef = React.useRef<HTMLDivElement>(null);

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

  // Fetch tokens from database on mount and find user's token (optional - for token-based features)
  useEffect(() => {
    const loadUserToken = async () => {
      if (!userId) {
        setTokenLoading(false);
        return;
      }

      // Fetch tokens from database if not already initialized
      if (!initialized) {
        await fetchTokens();
      }

      // Look for user's token (optional - streaming works without it now)
      const token = getTokenByCreator(userId);
      if (token) {
        console.log('Found user token:', token.symbol);
        setUserToken(token);
      }
      // No longer falling back to GOTH - token is optional
      setTokenLoading(false);
    };

    loadUserToken();
  }, [userId, initialized, fetchTokens, getTokenByCreator]);

  // Update userToken when tokens change (in case fetchTokens completes)
  useEffect(() => {
    if (initialized && userId) {
      const token = getTokenByCreator(userId);
      if (token) {
        console.log('Updated user token from store:', token.symbol);
        setUserToken(token);
      }
    }
  }, [initialized, userId, getTokenByCreator]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (userToken) {
      setIsLive(userToken.isLive || false);
    }
  }, [userToken]);

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

  // Assign stream to video element when it becomes available
  useEffect(() => {
    // Use a small delay to ensure the video element is fully mounted
    const timer = setTimeout(() => {
      if (isLive && streamRef.current && videoRef.current) {
        // Only assign if not already assigned to prevent flickering
        if (videoRef.current.srcObject !== streamRef.current) {
          console.log('Assigning stream to video element');
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(err => console.error('Error playing video:', err));
        }
      } else if (!isLive && videoRef.current) {
        // Clear video when not live
        videoRef.current.srcObject = null;
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isLive]);

  // Cleanup on unmount - inline the cleanup to avoid hoisting issues
  useEffect(() => {
    return () => {
      console.log('Stopping camera...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      // Clear thumbnail interval
      if (thumbnailIntervalRef.current) {
        clearInterval(thumbnailIntervalRef.current);
        thumbnailIntervalRef.current = null;
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

  if (status === 'loading' || tokenLoading || userLoading) {
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

      // If video element already exists, assign stream immediately
      if (videoRef.current) {
        console.log('Video element exists, assigning stream immediately');
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
          throw err;
        });
        console.log('✅ Video playing');
      } else {
        console.log('Video element does not exist yet, will be assigned via callback ref');
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

      // Use user-based room name from API, or fallback to token symbol if available
      const roomName = data.roomName || (userToken ? userToken.symbol : `user-${userId}`);
      setCurrentRoomName(roomName);
      currentRoomNameRef.current = roomName; // Also set ref for use in intervals
      console.log('Using room name:', roomName);

      // Start camera BEFORE setting isLive
      console.log('Starting camera...');
      await startCamera();

      console.log('Camera started, stream ref:', streamRef.current);
      console.log('Setting isLive to true...');
      setIsLive(true);

      // Update token if user has one (optional)
      if (userToken) {
        updateToken(userToken.symbol, { isLive: true });
      }

      // Start LiveKit broadcast with room name
      if (streamRef.current) {
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
    console.log('userToken:', userToken?.symbol);

    // Save roomName before clearing state
    const roomNameToDelete = currentRoomNameRef.current;

    try {
      // Stop camera and UI regardless of stream ID
      stopCamera();
      setIsLive(false);
      setSessionTime(0);
      setStreamTitle('');
      setCurrentRoomName(null);
      currentRoomNameRef.current = null;
      setChatMessages([]); // Clear chat messages
      setActivityEvents([]); // Clear activity events

      // Update token if user has one (optional)
      if (userToken) {
        updateToken(userToken.symbol, { isLive: false });
      }

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

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  // Show the Twitch-style stream manager for all authenticated users
  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      {/* Top Stats Bar */}
      <div className="bg-[#18181b] border-b border-gray-800 px-2 lg:px-4 py-2 overflow-x-auto">
        <div className="flex items-center justify-center max-w-[1920px] mx-auto">
          <div className="flex items-center space-x-3 lg:space-x-8 text-sm">
            <div className="flex items-center space-x-1 lg:space-x-2">
              <Clock className="h-3 w-3 lg:h-5 lg:w-5 text-blue-400" />
              <div>
                <div className="text-sm lg:text-xl font-bold">{formatTime(sessionTime)}</div>
                <div className="text-[10px] lg:text-xs text-gray-400">Session</div>
              </div>
            </div>
            <div className="flex items-center space-x-1 lg:space-x-2">
              <Eye className="h-3 w-3 lg:h-5 lg:w-5 text-yellow-400" />
              <div>
                <div className="text-sm lg:text-xl font-bold">{userToken?.viewers || 0}</div>
                <div className="text-[10px] lg:text-xs text-gray-400">Viewers</div>
              </div>
            </div>
            <div className="flex items-center space-x-1 lg:space-x-2">
              <Users className="h-3 w-3 lg:h-5 lg:w-5 text-purple-400" />
              <div>
                <div className="text-sm lg:text-xl font-bold">{userToken?.holders || 0}</div>
                <div className="text-[10px] lg:text-xs text-gray-400">Followers</div>
              </div>
            </div>
            {userToken && (
              <div className="hidden lg:flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                <div>
                  <div className="text-xl font-bold">${userToken.marketCap.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Market Cap</div>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-1 lg:space-x-2">
              <Wallet className="h-3 w-3 lg:h-5 lg:w-5 text-orange-400" />
              <div>
                <div className="text-sm lg:text-xl font-bold">0.00</div>
                <div className="text-[10px] lg:text-xs text-gray-400">SOL</div>
              </div>
            </div>
            <div className="flex items-center space-x-1 lg:space-x-2">
              <Trophy className="h-3 w-3 lg:h-5 lg:w-5 text-yellow-500" />
              <div>
                <div className="text-sm lg:text-xl font-bold">-</div>
                <div className="text-[10px] lg:text-xs text-gray-400">Rank</div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Main Layout - Stacks on mobile, 3-column on desktop */}
        <div className="flex flex-col lg:flex-row max-w-[1920px] mx-auto">
          {/* Activity Feed - Hidden on mobile, Left Column on desktop */}
          <div className="hidden lg:flex bg-[#18181b] border-r border-gray-800 flex-col h-[calc(100vh-180px)] w-[280px] flex-shrink-0">
            <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold">Activity Feed</h2>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div ref={activityContainerRef} className="p-4 flex-1 overflow-y-auto">
              {activityEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-2xl font-bold mb-2">It's quiet. Too quiet...</div>
                  <p className="text-sm text-gray-400">
                    We'll show your new follows, tips, and activity here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityEvents.map((event) => (
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

          {/* Stream Preview - Full width on mobile, Center Column on desktop */}
          <div className="flex-1 bg-[#0e0e10] flex flex-col lg:h-[calc(100vh-180px)] order-first lg:order-none">
            {/* Video Preview */}
            <div className="relative bg-black aspect-video overflow-hidden flex-shrink-0">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isLive ? '' : 'hidden'}`}
                />
                {!isLive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl font-bold text-gray-600 mb-4">OFFLINE</div>
                      <Button
                        onClick={handleGoLive}
                        className="bg-purple-600 hover:bg-purple-700"
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
                <div className="mb-4 flex items-center gap-3">
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
                    onClick={handleEndStream}
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 ml-auto"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop Stream
                  </Button>
                </div>
              )}

              {/* Stream Info */}
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.image || userData?.avatar || userToken?.avatar} />
                  <AvatarFallback className="bg-purple-600">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{username}</div>
                  <Badge className={isLive ? "bg-red-600" : "bg-gray-600"}>
                    {isLive ? "LIVE" : "OFFLINE"}
                  </Badge>
                  {isLive && currentRoomName && (
                    <div className="text-xs text-green-400 mt-1">
                      Broadcasting as: {currentRoomName}
                    </div>
                  )}
                  {isLive && currentRoomName && (
                    <div className="text-xs text-blue-400 mt-1">
                      Viewers can watch at: <a href={`/live/${currentRoomName}`} target="_blank" className="underline hover:text-blue-300">/live/{currentRoomName}</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* My Chat - Full width on mobile below video, Right Column on desktop */}
          <div className="bg-[#18181b] border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col h-[400px] lg:h-[calc(100vh-180px)] w-full lg:w-[300px] flex-shrink-0">
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
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-2 text-sm">
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
                            ${msg.tip}
                          </span>
                        )}
                        <p className="text-white break-words">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 p-3">
              <input
                type="text"
                placeholder="Send a message"
                className="w-full bg-[#0e0e10] border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                disabled={!isLive}
              />
            </div>
          </div>
        </div>
      </div>
    );
}
