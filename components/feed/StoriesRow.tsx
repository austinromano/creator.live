'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Gamepad2, Users, BookOpen, GraduationCap } from 'lucide-react';

export interface StoryUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isLive?: boolean;
  isOnline?: boolean;
  hasStory?: boolean;
}

export interface UserRoom {
  id: string;
  name: string;
  icon: string | null;
  template: string | null;
}

interface StoriesRowProps {
  users: StoryUser[];
  rooms?: UserRoom[];
  currentUserAvatar?: string | null;
  onAddStoryClick?: () => void;
}

// Get template icon component
function getTemplateIcon(template: string | null) {
  switch (template) {
    case 'gaming':
      return <Gamepad2 className="h-6 w-6 text-purple-400" />;
    case 'friends':
      return <Users className="h-6 w-6 text-pink-400" />;
    case 'study':
      return <BookOpen className="h-6 w-6 text-yellow-400" />;
    case 'creative':
      return <GraduationCap className="h-6 w-6 text-blue-400" />;
    default:
      return null;
  }
}

export function StoriesRow({ users, rooms = [], currentUserAvatar, onAddStoryClick }: StoriesRowProps) {
  return (
    <div className="border-b border-purple-900/20 bg-gradient-to-b from-black/40 to-transparent py-1">
      <div className="flex gap-4 overflow-x-auto px-4 pt-3 pb-3 scrollbar-hide">
        {/* Your Story / Add Room */}
        <button
          onClick={onAddStoryClick}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
        >
          <div className="relative group">
            <div className="absolute inset-0 rounded-xl p-[2px] bg-gradient-to-br from-gray-700 to-gray-800 group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-300">
              <div className="w-full h-full rounded-xl bg-black p-[2px]">
                <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#1a1225] to-[#0f0a15]">
                  {currentUserAvatar ? (
                    <Avatar className="h-full w-full rounded-lg">
                      <AvatarImage src={currentUserAvatar} className="rounded-lg" />
                      <AvatarFallback className="bg-[#1a1225] text-white rounded-lg">
                        You
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Plus className="h-6 w-6 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            {/* Spacer to maintain size */}
            <div className="w-[70px] h-[70px]" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center ring-2 ring-black shadow-lg shadow-purple-500/50">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
          <span className="text-sm text-gray-300 font-medium max-w-[75px] truncate">
            Add room
          </span>
        </button>

        {/* User's Created Rooms */}
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/room/${room.id}`}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
          >
            <div className="relative group">
              <div className="absolute inset-0 rounded-xl p-[2px] bg-gradient-to-br from-purple-500 to-pink-500 group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300 shadow-lg shadow-purple-500/20">
                <div className="w-full h-full rounded-xl bg-black p-[2px]">
                  <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#1a1225] to-[#0f0a15]">
                    {room.icon ? (
                      <Avatar className="h-full w-full rounded-lg">
                        <AvatarImage src={room.icon} className="rounded-lg" />
                        <AvatarFallback className="bg-[#1a1225] text-white rounded-lg">
                          {room.name[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      getTemplateIcon(room.template) || (
                        <span className="text-xl font-bold text-white">
                          {room.name[0]?.toUpperCase() || '?'}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
              {/* Spacer to maintain size */}
              <div className="w-[70px] h-[70px]" />
            </div>
            <span className="text-sm text-gray-300 font-medium max-w-[70px] truncate">
              {room.name}
            </span>
          </Link>
        ))}

        {/* Following Stories */}
        {users.map((user) => (
          <Link
            key={user.id}
            href={user.isLive ? `/live/user-${user.id}` : `/profile/${user.username}`}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
          >
            <div className="relative group">
              {/* Gradient ring for stories/live/online */}
              <div
                className={`absolute inset-0 rounded-full p-[2px] transition-all duration-300 ${
                  user.isLive
                    ? 'bg-gradient-to-br from-red-500 via-pink-500 to-purple-500 shadow-lg shadow-red-500/30 group-hover:shadow-red-500/50'
                    : user.hasStory
                    ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50'
                    : user.isOnline
                    ? 'bg-green-500 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50'
                    : 'bg-gray-700 group-hover:bg-gray-600'
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
              <div className="w-[70px] h-[70px]" />

              {/* Live badge */}
              {user.isLive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 rounded text-[8px] font-bold text-white uppercase">
                  Live
                </div>
              )}

              {/* Online indicator (green dot with breathing glow) - only show if online and not live */}
              {user.isOnline && !user.isLive && (
                <div className="absolute bottom-0.5 right-0.5">
                  {/* Glow background */}
                  <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                  {/* Solid dot */}
                  <div className="relative w-4 h-4 bg-green-500 rounded-full ring-[1.5px] ring-[#0f0a15]" />
                </div>
              )}
            </div>
            <span className="text-sm text-gray-300 font-medium max-w-[70px] truncate">
              {user.username}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
