'use client';

import { Menu, Star, Bell } from 'lucide-react';

interface ProfileHeaderProps {
  onMenuClick?: () => void;
  onStarClick?: () => void;
  onNotificationClick?: () => void;
}

export function ProfileHeader({
  onMenuClick,
  onStarClick,
  onNotificationClick,
}: ProfileHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        onClick={onMenuClick}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Menu className="h-6 w-6 text-white" />
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={onStarClick}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Star className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={onNotificationClick}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Bell className="h-6 w-6 text-white" />
        </button>
      </div>
    </div>
  );
}
