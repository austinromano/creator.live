'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LiveKitStreamer } from '@/lib/livekit-stream';
import { Eye } from 'lucide-react';
import { isAudioUnlocked, onAudioUnlock } from '@/lib/audio-unlock';

interface UserStream {
  id: string;
  roomName: string;
  title: string;
  isLive: boolean;
  viewerCount: number;
  startedAt: string | null;
  user: {
    id: string;
    username: string | null;
    avatar: string | null;
    walletAddress: string | null;
  };
}

interface MobileStreamCardProps {
  stream: UserStream;
  size?: 'xlarge' | 'large' | 'medium' | 'small' | 'xsmall';
}

export function MobileStreamCard({ stream, size = 'medium' }: MobileStreamCardProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamerRef = useRef<LiveKitStreamer | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const hasTriedPlay = useRef(false);

  const username = stream.user.username || 'Anonymous';
  const initials = username.slice(0, 2).toUpperCase();

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/profile/${username}`);
  };

  // Aspect ratios based on size
  const aspectClasses = {
    xlarge: 'aspect-[1/2]',     // Extra tall - spans ~2 cards (right column first)
    large: 'aspect-[3/4]',      // Tall
    medium: 'aspect-[4/5]',     // Medium height - most cards
    small: 'aspect-[1/1]',      // Square
    xsmall: 'aspect-[6/5]',     // Slightly shorter than square
  };

  // Try to play video
  const tryPlay = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = true;
    videoRef.current.play()
      .then(() => {
        setIsConnected(true);
        hasTriedPlay.current = true;
      })
      .catch(() => {});
  };

  // Auto-connect to live stream
  useEffect(() => {
    if (!stream.isLive || !videoRef.current) {
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
        setIsConnected(false);
        hasTriedPlay.current = false;
      }
      return;
    }

    if (streamerRef.current) return;

    const connectToStream = async () => {
      streamerRef.current = new LiveKitStreamer(stream.roomName);
      try {
        await streamerRef.current.startViewingWithElement(
          videoRef.current!,
          () => tryPlay(),
          undefined,
          { muteAudio: true }
        );
      } catch (error) {
        console.error('Failed to connect to stream preview:', error);
      }
    };

    connectToStream();

    return () => {
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
      }
    };
  }, [stream.isLive, stream.roomName]);

  // Listen for user interaction to trigger play
  useEffect(() => {
    if (isConnected) return;

    const handleInteraction = () => {
      if (videoRef.current?.srcObject && !isConnected) {
        tryPlay();
      }
    };

    const events = ['touchstart', 'touchend', 'click', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { passive: true, capture: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction, true);
      });
    };
  }, [isConnected]);

  // Register callback for audio unlock
  useEffect(() => {
    if (isConnected) return;
    onAudioUnlock(() => {
      if (videoRef.current?.srcObject) tryPlay();
    });
  }, [isConnected]);

  return (
    <Link href={`/live/${stream.roomName}`}>
      <div className="group relative rounded-2xl overflow-hidden cursor-pointer">
        {/* Card with variable aspect ratio based on size */}
        <div className={`relative ${aspectClasses[size]} bg-gradient-to-br from-[#4a2d5c] via-[#3d2850] to-[#2a1f3d]`}>
          {/* Video or Avatar fallback */}
          {!isConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Avatar className="h-20 w-20 ring-4 ring-white/20">
                <AvatarImage src={stream.user.avatar || undefined} alt={username} />
                <AvatarFallback className="bg-purple-600 text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Live video */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isConnected ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            muted
            playsInline
            webkit-playsinline="true"
          />

          {/* Top badges row */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-center">
            <Badge className="bg-[#cc0000] text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider">
              LIVE
            </Badge>
            <Badge variant="secondary" className="bg-[#2a2438]/90 text-white text-[9px] rounded-full px-2 py-0.5">
              <Eye className="h-3 w-3 mr-0.5" />
              {stream.viewerCount || 0}
            </Badge>
          </div>
        </div>

        {/* Creator info below card */}
        <div className="bg-[#1e2535] p-2.5">
          <div className="flex items-center gap-2">
            <div
              onClick={handleProfileClick}
              className="flex-shrink-0 cursor-pointer"
            >
              <Avatar className="h-7 w-7 ring-1 ring-purple-500 hover:ring-2 transition-all">
                <AvatarImage src={stream.user.avatar || undefined} alt={username} />
                <AvatarFallback className="bg-purple-600 text-[9px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div
                onClick={handleProfileClick}
                className="hover:underline cursor-pointer"
              >
                <h3 className="text-white font-semibold text-[11px] truncate">
                  {username}
                </h3>
              </div>
              <p className="text-gray-400 text-[9px] truncate">
                {stream.title}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
