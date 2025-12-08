'use client';

import { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Edit2, CheckCircle, Loader2 } from 'lucide-react';

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
  onCoverUpdate?: (newCoverUrl: string) => void;
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
  onCoverUpdate,
}: ProfileAvatarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [currentCoverUrl, setCurrentCoverUrl] = useState(coverUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          {/* Avatar with ring */}
          <div className="relative">
            <Avatar
              className={`h-24 w-24 border-4 border-[#0f0a15] relative ${isOwnProfile ? 'cursor-pointer' : ''}`}
              onClick={isOwnProfile ? onEditProfile : undefined}
            >
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="bg-purple-600 text-white text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Edit indicator on avatar for own profile */}
            {isOwnProfile && (
              <button
                onClick={onEditProfile}
                className="absolute bottom-0 right-0 p-1.5 bg-purple-600 rounded-full border-2 border-[#0f0a15] hover:bg-purple-500 transition-colors"
              >
                <Edit2 className="h-3 w-3 text-white" />
              </button>
            )}

            {/* Live indicator */}
            {isLive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </div>
            )}
          </div>

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
