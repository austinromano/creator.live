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
  const [isUploading, setIsUploading] = useState(false);
  const [currentCoverUrl, setCurrentCoverUrl] = useState(coverUrl);
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleCoverClick = () => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/user/cover', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload cover image');
      }

      setCurrentCoverUrl(data.coverUrl);
      onCoverUpdate?.(data.coverUrl);
    } catch (error) {
      console.error('Error uploading cover:', error);
      alert('Failed to upload cover image. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Wrap avatar in Link when live, otherwise handle normally
  const avatarContent = (
    <div className="relative h-24 w-24">
      {/* Live stream video in avatar circle - always render when live */}
      {isLive && liveStream && (
        <>
          {/* Video container - circular clip */}
          <div className="absolute inset-0 h-24 w-24 rounded-full overflow-hidden border-4 border-red-500 z-10 bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              webkit-playsinline="true"
            />
          </div>
          {/* Pulsing glow effect behind */}
          <div className="absolute inset-0 h-24 w-24 rounded-full bg-red-500/30 blur-md animate-pulse -z-10" />
        </>
      )}

      {/* Regular avatar (shows when not live) */}
      {!isLive && (
        <>
          {/* Green glow effect when online - breathing animation */}
          {isOnline && (
            <div className="absolute inset-0 h-24 w-24 rounded-full bg-green-500 blur-md animate-breathe -z-10" />
          )}
          <Avatar
            className={`h-24 w-24 border-4 ${isOnline ? 'border-green-500' : 'border-[#0f0a15]'} relative ${isOwnProfile ? 'cursor-pointer' : ''}`}
            onClick={isOwnProfile ? onEditProfile : undefined}
          >
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="bg-purple-600 text-white text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
        </>
      )}

      {/* Fallback avatar shown while stream connects */}
      {isLive && !isStreamConnected && (
        <div className="absolute inset-0 h-24 w-24 rounded-full overflow-hidden border-4 border-red-500 z-5 flex items-center justify-center bg-purple-600">
          <span className="text-white text-2xl font-bold">{initials}</span>
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
    <div className="flex flex-col">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Cover Image - TikTok style (shorter) */}
      <div className="relative h-24 w-full bg-gradient-to-b from-[#1a1225] to-[#0f0a15]">
        {currentCoverUrl && (
          <img src={currentCoverUrl} alt="Cover" className="w-full h-full object-cover opacity-60" />
        )}
        {/* Upload overlay while uploading */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
        {/* Edit cover button for own profile */}
        {isOwnProfile && !isUploading && (
          <button
            onClick={handleCoverClick}
            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            <Camera className="h-4 w-4 text-white" />
          </button>
        )}
      </div>

      {/* Content below cover - TikTok centered layout */}
      <div className="relative px-4">
        {/* Avatar overlapping cover - centered */}
        <div className="flex flex-col items-center -mt-12">
          {/* Avatar - wrapped in Link when live to go to stream */}
          {isLive && liveStream ? (
            <Link href={`/live/${liveStream.roomName}`} className="cursor-pointer">
              {avatarContent}
            </Link>
          ) : (
            avatarContent
          )}

          {/* Name with verified badge - TikTok style */}
          <div className="flex items-center gap-1.5 mt-2">
            <h1 className="text-lg font-bold text-white">{name}</h1>
            {isVerified && (
              <CheckCircle className="h-4 w-4 text-[#20d5ec] fill-[#20d5ec]" />
            )}
          </div>

          {/* Username - TikTok style */}
          <p className="text-gray-400 text-sm -mt-0.5">@{username}</p>
        </div>
      </div>
    </div>
  );
}
