'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Edit2, CheckCircle } from 'lucide-react';

interface ProfileAvatarProps {
  avatarUrl?: string;
  coverUrl?: string;
  name: string;
  username: string;
  bio?: string;
  isLive?: boolean;
  isVerified?: boolean;
  isOwnProfile?: boolean;
  onEditProfile?: () => void;
}

export function ProfileAvatar({
  avatarUrl,
  coverUrl,
  name,
  username,
  bio,
  isLive = false,
  isVerified = false,
  isOwnProfile = false,
  onEditProfile,
}: ProfileAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col">
      {/* Cover Image */}
      <div className="relative h-32 w-full bg-gradient-to-br from-purple-900/60 via-purple-800/40 to-pink-900/30">
        {coverUrl ? (
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-purple-800/40 to-pink-900/30" />
        )}
        {/* Edit cover button for own profile */}
        {isOwnProfile && (
          <button className="absolute bottom-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors">
            <Camera className="h-4 w-4 text-white" />
          </button>
        )}
      </div>

      {/* Avatar overlapping cover */}
      <div className="flex flex-col items-center px-4 -mt-12">
        {/* Avatar with glow and status indicator */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-sm scale-105" />
          <Avatar className="h-24 w-24 border-4 border-[#0f0a15] relative ring-2 ring-purple-500">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="bg-purple-600 text-white text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Live indicator */}
          {isLive && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              LIVE
            </div>
          )}

          {/* Online indicator (when not live) */}
          {!isLive && (
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0f0a15]" />
          )}
        </div>

        {/* Name with verified badge */}
        <div className="flex items-center gap-1.5 mt-3">
          <h1 className="text-xl font-bold text-white">{name}</h1>
          {isVerified && (
            <CheckCircle className="h-5 w-5 text-purple-500 fill-purple-500" />
          )}
        </div>

        {/* Username */}
        <p className="text-gray-400 text-sm">@{username}</p>

        {/* Bio */}
        {bio && (
          <p className="text-gray-300 text-sm text-center mt-2 px-4 max-w-xs">
            {bio}
          </p>
        )}

        {/* Edit Profile button for own profile */}
        {isOwnProfile && (
          <Button
            onClick={onEditProfile}
            variant="outline"
            size="sm"
            className="mt-3 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
}
