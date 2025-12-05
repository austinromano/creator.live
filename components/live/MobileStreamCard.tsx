'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
  variant?: 'default' | 'ai';
  size?: 'featured' | 'large' | 'medium' | 'small';
  showSpotlightText?: boolean;
}

export function MobileStreamCard({ stream, variant = 'default', size = 'medium', showSpotlightText = false }: MobileStreamCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamerRef = useRef<LiveKitStreamer | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const hasTriedPlay = useRef(false);

  const username = stream.user.username || 'Anonymous';
  const initials = username.slice(0, 2).toUpperCase();

  // Aspect ratios based on size
  const aspectClasses = {
    featured: 'aspect-[1/2]',   // Extra tall - spans 2 cards height (AI Spotlight first)
    large: 'aspect-[3/4]',      // Tall - for first left card
    medium: 'aspect-[4/5]',     // Medium height
    small: 'aspect-[1/1]',      // Square/shorter
  };

  // Gradient backgrounds for AI spotlight cards
  const aiGradients = [
    'from-purple-600 via-pink-500 to-purple-700',
    'from-indigo-600 via-purple-500 to-pink-600',
    'from-fuchsia-600 via-purple-600 to-indigo-600',
  ];
  const gradientClass = variant === 'ai'
    ? aiGradients[Math.abs(stream.id.charCodeAt(0)) % aiGradients.length]
    : '';

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
      <div className="group relative rounded-xl overflow-hidden cursor-pointer">
        {/* Card with variable aspect ratio based on size */}
        <div className={`relative ${aspectClasses[size]} ${variant === 'ai' ? `bg-gradient-to-br ${gradientClass}` : 'bg-gray-900'}`}>
          {/* Video or Avatar fallback */}
          {!isConnected && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center ${
              variant === 'ai'
                ? ''
                : 'bg-gradient-to-br from-gray-800 to-gray-900'
            }`}>
              {/* Decorative sparkles for AI cards */}
              {variant === 'ai' && (
                <>
                  <div className="absolute top-4 right-4 text-white/40 text-lg">✦</div>
                  <div className="absolute top-8 left-6 text-white/30 text-sm">✦</div>
                  <div className="absolute bottom-12 right-8 text-white/30 text-sm">✦</div>
                </>
              )}
              <Avatar className="h-20 w-20 ring-4 ring-white/20">
                <AvatarImage src={stream.user.avatar || undefined} alt={username} />
                <AvatarFallback className="bg-purple-600 text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Spotlight text for featured AI cards */}
              {showSpotlightText && (
                <div className="mt-4 text-center">
                  <h3 className="text-white text-xl font-bold">AI Streamer</h3>
                  <h3 className="text-white text-xl font-bold">Spotlight</h3>
                </div>
              )}
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

          {/* LIVE badge */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-red-600 text-white text-xs font-bold px-2 py-0.5">
              LIVE
            </Badge>
          </div>

          {/* Viewer count */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/60 text-white text-xs">
              <Eye className="h-3 w-3 mr-1" />
              {stream.viewerCount || 0}
            </Badge>
          </div>
        </div>

        {/* Creator info below card */}
        <div className="bg-gray-900 p-2.5">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 ring-2 ring-purple-500">
              <AvatarImage src={stream.user.avatar || undefined} alt={username} />
              <AvatarFallback className="bg-purple-600 text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm truncate">
                {username}
              </h3>
              <p className="text-gray-400 text-xs truncate">
                {stream.title}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
