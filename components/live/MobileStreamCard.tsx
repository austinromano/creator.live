'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useStreamConnection } from '@/hooks/useStreamConnection';
import type { Stream } from '@/lib/types/stream';

interface MobileStreamCardProps {
  stream: Stream;
  size?: 'xlarge' | 'large' | 'medium' | 'small' | 'xsmall';
}

export function MobileStreamCard({ stream }: MobileStreamCardProps) {
  const [imageError, setImageError] = useState(false);

  const { videoRef, isConnected } = useStreamConnection({
    roomName: stream.roomName,
    isLive: stream.isLive,
    muteAudio: true,
    autoConnect: true,
  });

  const username = stream.user.username || 'Anonymous';
  const displayName = stream.user.displayName || username;

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
          {/* Name */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold text-base truncate">
              {displayName}
            </h3>
          </div>

          {/* Category Tag */}
          {stream.category && (
            <div className="inline-block bg-pink-500/30 text-pink-300 text-xs px-2 py-0.5 rounded-full">
              {stream.category}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
