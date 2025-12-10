'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MapPin, Heart } from 'lucide-react';
import { LiveKitStreamer } from '@/lib/livekit-stream';
import { onAudioUnlock } from '@/lib/audio-unlock';

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
    displayName: string | null;
    avatar: string | null;
    walletAddress: string | null;
    isOnline: boolean;
    age: number | null;
    location: string | null;
    lookingFor: string | null;
  };
}

interface MobileStreamCardProps {
  stream: UserStream;
  size?: 'xlarge' | 'large' | 'medium' | 'small' | 'xsmall';
}

export function MobileStreamCard({ stream }: MobileStreamCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamerRef = useRef<LiveKitStreamer | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [imageError, setImageError] = useState(false);
  const hasTriedPlay = useRef(false);

  const username = stream.user.username || 'Anonymous';
  const displayName = stream.user.displayName || username;

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
      <div className="relative aspect-[1/1] rounded-2xl overflow-hidden bg-gray-800 group">
        {/* Profile Image - shown when not connected to stream */}
        {!isConnected && stream.user.avatar && !imageError ? (
          <img
            src={stream.user.avatar}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : !isConnected ? (
          <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
            <Heart className="h-12 w-12 text-pink-500/50" />
          </div>
        ) : null}

        {/* Live video stream */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${isConnected ? 'opacity-100' : 'opacity-0'}`}
          autoPlay
          muted
          playsInline
          webkit-playsinline="true"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Online Indicator */}
        {stream.user.isOnline && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-white">Online</span>
          </div>
        )}

        {/* Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Name and Age */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold text-base truncate">
              {displayName}
            </h3>
            {stream.user.age && (
              <span className="text-white/80 text-sm">{stream.user.age}</span>
            )}
          </div>

          {/* Location */}
          {stream.user.location && (
            <div className="flex items-center gap-1 text-gray-300 text-xs mb-2">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{stream.user.location}</span>
            </div>
          )}

          {/* Looking For Tag */}
          {stream.user.lookingFor && (
            <div className="inline-block bg-pink-500/30 text-pink-300 text-xs px-2 py-0.5 rounded-full">
              {stream.user.lookingFor}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
