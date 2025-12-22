'use client';

import { Lock, Star, Play, Camera } from 'lucide-react';
import Image from 'next/image';

export interface ContentGridItem {
  id: string;
  type: 'locked' | 'free' | 'paid' | 'replay';
  price?: number;
  viewerCount?: number;
  thumbnailUrl?: string | null;
  contentUrl?: string | null;
  title?: string | null;
}

function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('video');
}

interface ContentGridProps {
  items: ContentGridItem[];
  onItemClick?: (item: ContentGridItem) => void;
  isOwnProfile?: boolean;
  onAddClick?: () => void;
}

function formatViewerCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}

function ContentGridItemComponent({
  item,
  onClick,
}: {
  item: ContentGridItem;
  onClick?: () => void;
}) {
  const isLocked = item.type === 'locked' || item.type === 'paid';
  const mediaUrl = item.thumbnailUrl || item.contentUrl;
  const isVideo = isVideoUrl(item.contentUrl);

  return (
    <button
      onClick={onClick}
      className="relative w-full rounded-lg overflow-hidden bg-[#1a1a1d] group focus:outline-none focus:ring-2 focus:ring-purple-500 aspect-[3/4]"
    >
      {/* Thumbnail or Video preview */}
      {isVideo && item.contentUrl ? (
        item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title || ''}
            fill
            className={`object-cover ${isLocked ? 'blur-lg scale-110' : ''}`}
            sizes="(max-width: 768px) 33vw, 200px"
          />
        ) : (
          <video
            src={`${item.contentUrl}#t=0.1`}
            className={`absolute inset-0 w-full h-full object-cover ${isLocked ? 'blur-lg scale-110' : ''}`}
            muted
            playsInline
            preload="metadata"
          />
        )
      ) : item.thumbnailUrl ? (
        <Image
          src={item.thumbnailUrl}
          alt={item.title || ''}
          fill
          className={`object-cover ${isLocked ? 'blur-lg scale-110' : ''}`}
          sizes="(max-width: 768px) 33vw, 200px"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-gray-900" />
      )}

      {/* Video play icon indicator */}
      {isVideo && !isLocked && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
          <Play className="h-3 w-3 text-white fill-white" />
        </div>
      )}

      {/* Dark overlay for locked content */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      {/* Locked/Paid overlay with lock icon and price */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
              <Lock className="h-5 w-5 text-gray-300" />
            </div>
            {item.type === 'paid' && item.price && (
              <span className="text-white font-bold text-lg">${item.price}</span>
            )}
          </div>
        </div>
      )}

      {/* Live Replay badge */}
      {item.type === 'replay' && (
        <div className="absolute top-2 left-2 right-2 flex justify-center">
          <div className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
            <Play className="h-2.5 w-2.5 fill-white" />
            <span>LIVE REPLAY</span>
          </div>
        </div>
      )}

      {/* Viewer count badge - bottom left */}
      {item.viewerCount !== undefined && item.viewerCount > 0 && item.type === 'free' && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5">
          <Star className="h-3 w-3 text-purple-500 fill-purple-500" />
          <span className="text-white text-xs font-semibold">
            {formatViewerCount(item.viewerCount)}
          </span>
        </div>
      )}

      {/* Hover effect */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
    </button>
  );
}

function AddPostButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-[#1a1a1d] group focus:outline-none focus:ring-2 focus:ring-purple-500 flex flex-col items-center justify-center gap-2"
    >
      <div className="w-14 h-14 rounded-full bg-gray-800/80 flex items-center justify-center">
        <Camera className="h-6 w-6 text-gray-400" />
      </div>
      <span className="text-gray-400 text-xs">Click to add photo</span>
      {/* Hover effect */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
    </button>
  );
}

export function ContentGrid({ items, onItemClick, isOwnProfile = false, onAddClick }: ContentGridProps) {
  // Always show grid if own profile (to show add button) or if there are items
  if (!isOwnProfile && items.length === 0) {
    return null;
  }

  return (
    <div className="px-2 pb-24">
      <div className="grid grid-cols-3 gap-1">
        {/* Add button always first for own profile */}
        {isOwnProfile && <AddPostButton onClick={onAddClick} />}
        {items.map((item) => (
          <ContentGridItemComponent
            key={item.id}
            item={item}
            onClick={() => onItemClick?.(item)}
          />
        ))}
      </div>
    </div>
  );
}
