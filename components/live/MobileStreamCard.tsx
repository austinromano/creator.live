'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useStreamConnection } from '@/hooks/useStreamConnection';
import type { Stream } from '@/lib/types/stream';

interface MobileStreamCardProps {
  stream: Stream;
  size?: 'xlarge' | 'large' | 'medium' | 'small' | 'xsmall';
}

// Gradient backgrounds for cards
const CARD_GRADIENTS = [
  'from-teal-400/80 to-green-300/80',      // Mint/teal
  'from-purple-400/80 to-purple-300/80',    // Purple
  'from-amber-200/80 to-orange-200/80',     // Cream/tan
  'from-cyan-400/80 to-teal-300/80',        // Cyan
  'from-indigo-400/80 to-purple-300/80',    // Indigo
];

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

  // Get a consistent gradient for this stream based on its id
  const gradientClass = useMemo(() => {
    const index = stream.id.charCodeAt(0) % CARD_GRADIENTS.length;
    return CARD_GRADIENTS[index];
  }, [stream.id]);

  return (
    <Link href={`/live/${stream.roomName}`}>
      <div className={`relative aspect-square rounded-xl overflow-hidden group`}>
        {/* Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-b ${gradientClass}`} />

        {/* Profile Image - always shown as fallback/loading state */}
        {stream.user.avatar && !imageError ? (
          <img
            src={stream.user.avatar}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Heart className="h-16 w-16 text-white/30" />
          </div>
        )}

        {/* Live video stream - overlays profile image when connected */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
          autoPlay
          muted
          playsInline
          webkit-playsinline="true"
        />

        {/* Online Badge - Top Right */}
        {stream.user.isOnline && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-white font-medium">Online</span>
          </div>
        )}

        {/* Bottom Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Bottom Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Name */}
          <h3 className="text-white font-bold text-lg drop-shadow-lg mb-1">
            {displayName}
          </h3>

          {/* Category Tag */}
          {stream.category && (
            <div className="inline-block bg-purple-500/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
              {stream.category}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
