'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { useStreamConnection } from '@/hooks/useStreamConnection';
import type { Stream } from '@/lib/types/stream';

interface UserStreamCardProps {
  stream: Stream;
}

export function UserStreamCard({ stream }: UserStreamCardProps) {
  const router = useRouter();

  const { videoRef, isConnected } = useStreamConnection({
    roomName: stream.roomName,
    isLive: stream.isLive,
    muteAudio: true,
    autoConnect: true,
  });

  const username = stream.user.username || 'Anonymous';
  const initials = username.slice(0, 2).toUpperCase();

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/profile/${username}`);
  };

  return (
    <Link href={`/live/${stream.roomName}`}>
      <div
        className="group relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
      >
        {/* Video Preview */}
        <div className="relative aspect-[4/3] bg-black">
          {/* Fallback shown while connecting */}
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/80 to-pink-900/80">
              <Avatar className="h-20 w-20 ring-4 ring-white/20">
                <AvatarImage src={stream.user.avatar || undefined} alt={username} />
                <AvatarFallback className="bg-purple-600 text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Live video element - always visible */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isConnected ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            muted
            playsInline
            webkit-playsinline="true"
          />


          {/* Live badge */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 animate-pulse">
              LIVE
            </Badge>
          </div>

          {/* Viewer count */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/70 text-white text-xs">
              <Eye className="h-3 w-3 mr-1" />
              {stream.viewerCount || 0}
            </Badge>
          </div>

        </div>

        {/* Creator info */}
        <div className="p-3">
          <div className="flex items-start space-x-3">
            <div
              onClick={handleProfileClick}
              className="flex-shrink-0 cursor-pointer"
            >
              <Avatar className="h-9 w-9 ring-2 ring-purple-500 hover:ring-purple-400 transition-all">
                <AvatarImage src={stream.user.avatar || undefined} alt={username} />
                <AvatarFallback className="bg-purple-600 text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0">
              <div
                onClick={handleProfileClick}
                className="hover:underline cursor-pointer"
              >
                <h3 className="text-white font-semibold text-sm truncate">
                  {username}
                </h3>
              </div>
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
