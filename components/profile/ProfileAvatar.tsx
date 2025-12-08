'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ProfileAvatarProps {
  avatarUrl?: string;
  name: string;
  username: string;
  greeting?: string;
}

export function ProfileAvatar({
  avatarUrl,
  name,
  username,
  greeting = 'welcome to my channel',
}: ProfileAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center px-4 py-2">
      {/* Avatar with neon purple glow */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-purple-500/50 blur-md scale-110" />
        <Avatar className="h-24 w-24 border-[3px] border-purple-500 relative">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="bg-purple-600 text-white text-2xl">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Name */}
      <h1 className="text-2xl font-bold text-white mt-4">{name}</h1>

      {/* Username */}
      <p className="text-gray-400 text-sm mt-0.5">@{username}</p>

      {/* Greeting */}
      <p className="text-gray-500 text-sm mt-2 mb-4">{greeting}</p>

      {/* Divider */}
      <div className="w-full border-t border-gray-800 mt-2" />
    </div>
  );
}
