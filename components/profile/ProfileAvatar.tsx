'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Edit2, CheckCircle, Loader2 } from 'lucide-react';
import { LiveKitStreamer } from '@/lib/livekit-stream';

interface LiveStreamInfo {
  id: string;
  roomName: string;
  title?: string;
  viewerCount?: number;
}

interface ProfileAvatarProps {
  avatarUrl?: string;
  coverUrl?: string;
  name: string;
  username: string;
  bio?: string;
  isOnline?: boolean;
  isLive?: boolean;
  liveStream?: LiveStreamInfo | null;
  isVerified?: boolean;
  isOwnProfile?: boolean;
  onEditProfile?: () => void;
  onCoverUpdate?: (newCoverUrl: string) => void;
}

export function ProfileAvatar({
  avatarUrl,
  coverUrl,
  name,
  username,
  bio,
  isOnline = false,
  isLive = false,
  liveStream,
  isVerified = false,
  isOwnProfile = false,
  onEditProfile,
  onCoverUpdate,
}: ProfileAvatarProps) {
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamerRef = useRef<LiveKitStreamer | null>(null);

  // Connect to live stream when user is live
  useEffect(() => {
    if (!isLive || !liveStream?.roomName || !videoRef.current) {
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
        setIsStreamConnected(false);
      }
      return;
    }

    const connectToStream = async () => {
      if (streamerRef.current) return;

      streamerRef.current = new LiveKitStreamer(liveStream.roomName);

      try {
        await streamerRef.current.startViewingWithElement(
          videoRef.current!,
          () => {
            setIsStreamConnected(true);
          },
          undefined,
          { muteAudio: true }
        );
      } catch (error) {
        console.error('Failed to connect to profile stream:', error);
      }
    };

    connectToStream();

    return () => {
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
      }
    };
  }, [isLive, liveStream?.roomName]);

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Wrap avatar in Link when live, otherwise handle normally
  const avatarContent = (
    <div className="relative h-20 w-20">
      {/* Live stream video in avatar circle - always render when live */}
      {isLive && liveStream && (
        <div className="absolute inset-0 h-20 w-20 rounded-full overflow-hidden border-3 border-red-500 z-10 bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            webkit-playsinline="true"
          />
        </div>
      )}

      {/* Regular avatar (shows when not live) */}
      {!isLive && (
        <Avatar
          className={`h-20 w-20 border-3 ${isOnline ? 'border-green-500' : 'border-[#0f0a15]'} relative ${isOwnProfile ? 'cursor-pointer' : ''}`}
          onClick={isOwnProfile ? onEditProfile : undefined}
        >
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="bg-purple-600 text-white text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Fallback avatar shown while stream connects */}
      {isLive && !isStreamConnected && (
        <div className="absolute inset-0 h-20 w-20 rounded-full overflow-hidden border-3 border-red-500 z-5 flex items-center justify-center bg-purple-600">
          <span className="text-white text-xl font-bold">{initials}</span>
        </div>
      )}

      {/* Edit indicator on avatar for own profile (only when not live) */}
      {isOwnProfile && !isLive && (
        <button
          onClick={onEditProfile}
          className="absolute bottom-0 right-0 p-1.5 bg-purple-600 rounded-full border-2 border-[#0f0a15] hover:bg-purple-500 transition-colors z-20"
        >
          <Edit2 className="h-3 w-3 text-white" />
        </button>
      )}

      {/* Live indicator badge */}
      {isLive && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse z-20">
          LIVE
        </div>
      )}

    </div>
  );

  return (
    <div className="flex flex-col bg-transparent">
      {/* Content - TikTok centered layout */}
      <div className="relative px-4 pb-2 bg-transparent overflow-hidden">
        {/* Avatar - centered */}
        <div className="flex flex-col items-center">
          {/* Avatar - wrapped in Link when live to go to stream */}
          {isLive && liveStream ? (
            <Link href={`/live/${liveStream.roomName}`} className="cursor-pointer">
              {avatarContent}
            </Link>
          ) : (
            avatarContent
          )}

          {/* Name with verified badge - TikTok style */}
          <div className="flex items-center gap-1 mt-1.5">
            <h1 className="text-base font-bold text-white">{name}</h1>
            {isVerified && (
              <CheckCircle className="h-3.5 w-3.5 text-[#20d5ec] fill-[#20d5ec]" />
            )}
          </div>

          {/* Username - TikTok style */}
          <p className="text-gray-400 text-xs -mt-0.5">@{username}</p>
        </div>
      </div>
    </div>
  );
}
