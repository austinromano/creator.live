'use client';

import { Grid3X3, PlayCircle, Sparkles } from 'lucide-react';

interface ContentTabsProps {
  activeTab: 'posts' | 'replays' | 'liked';
  onTabChange: (tab: 'posts' | 'replays' | 'liked') => void;
  postCount?: number;
  replayCount?: number;
  likedCount?: number;
}

export function ContentTabs({
  activeTab,
  onTabChange,
  postCount = 0,
  replayCount = 0,
  likedCount = 0,
}: ContentTabsProps) {
  const tabs = [
    { id: 'posts' as const, icon: Grid3X3, label: 'Posts', count: postCount },
    { id: 'replays' as const, icon: PlayCircle, label: 'Replays', count: replayCount },
    { id: 'liked' as const, icon: Sparkles, label: 'Sparked', count: likedCount },
  ];

  return (
    <div className="border-t border-gray-800">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors relative ${
                isActive
                  ? 'text-purple-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium hidden sm:inline">{tab.label}</span>
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
