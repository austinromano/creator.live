'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';

export interface StoryUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isLive?: boolean;
  hasStory?: boolean;
}

interface StoriesRowProps {
  users: StoryUser[];
  currentUserAvatar?: string | null;
  onAddStoryClick?: () => void;
}

export function StoriesRow({ users, currentUserAvatar, onAddStoryClick }: StoriesRowProps) {
  return (
    <div className="sticky top-14 z-40 bg-[#0f0a15] border-b border-gray-800 py-4">
      <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
        {/* Your Story */}
        <button
          onClick={onAddStoryClick}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="relative">
            <Avatar className="h-16 w-16 ring-2 ring-gray-700">
              <AvatarImage src={currentUserAvatar || undefined} />
              <AvatarFallback className="bg-gray-700 text-white">
                You
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center ring-2 ring-black">
              <Plus className="h-3 w-3 text-white" />
            </div>
          </div>
          <span className="text-xs text-gray-400 max-w-[64px] truncate">
            Your story
          </span>
        </button>

        {/* Following Stories */}
        {users.map((user) => (
          <Link
            key={user.id}
            href={user.isLive ? `/live/user-${user.id}` : `/profile/${user.username}`}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative">
              {/* Gradient ring for stories/live */}
              <div
                className={`absolute inset-0 rounded-full p-[2px] ${
                  user.isLive
                    ? 'bg-gradient-to-br from-red-500 via-pink-500 to-purple-500'
                    : user.hasStory
                    ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500'
                    : 'bg-gray-700'
                }`}
              >
                <div className="w-full h-full rounded-full bg-black p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <Avatar className="h-full w-full">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
              {/* Spacer to maintain size */}
              <div className="w-16 h-16" />

              {/* Live badge */}
              {user.isLive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-bold text-white uppercase">
                  Live
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400 max-w-[64px] truncate">
              {user.username}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
