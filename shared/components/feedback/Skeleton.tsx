'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Base skeleton component for loading states
 */
export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-800',
        {
          'rounded-full': variant === 'circular',
          rounded: variant === 'rectangular',
          'rounded-sm h-4': variant === 'text',
          'animate-pulse': animation === 'pulse',
        },
        className
      )}
      style={{ width, height }}
    />
  );
}

/**
 * Skeleton for a feed post
 */
export function PostSkeleton() {
  return (
    <div className="border-b border-gray-800 pb-4 mb-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Skeleton variant="circular" className="w-8 h-8" />
        <div className="flex-1">
          <Skeleton variant="text" className="w-24" />
        </div>
      </div>

      {/* Media */}
      <Skeleton className="w-full aspect-square" />

      {/* Actions & Caption */}
      <div className="px-3 pt-3 space-y-2">
        <div className="flex gap-4">
          <Skeleton variant="circular" className="w-7 h-7" />
          <Skeleton variant="circular" className="w-7 h-7" />
          <Skeleton variant="circular" className="w-7 h-7" />
        </div>
        <Skeleton variant="text" className="w-16" />
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-3/4" />
      </div>
    </div>
  );
}

/**
 * Skeleton for profile page
 */
export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Cover */}
      <Skeleton className="w-full h-40" />

      <div className="px-4 -mt-16">
        {/* Avatar */}
        <Skeleton variant="circular" className="w-32 h-32 border-4 border-[#0f0a15]" />

        {/* Name & Username */}
        <div className="mt-4 space-y-2">
          <Skeleton variant="text" className="w-32 h-6" />
          <Skeleton variant="text" className="w-24" />
        </div>

        {/* Stats */}
        <div className="flex gap-8 mt-4">
          <Skeleton variant="text" className="w-16" />
          <Skeleton variant="text" className="w-16" />
          <Skeleton variant="text" className="w-16" />
        </div>

        {/* Bio */}
        <div className="mt-4 space-y-2">
          <Skeleton variant="text" className="w-full" />
          <Skeleton variant="text" className="w-2/3" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for stream card
 */
export function StreamCardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden">
      {/* Thumbnail */}
      <Skeleton className="aspect-video" />

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <Skeleton variant="circular" className="w-10 h-10" />
          <div className="flex-1 space-y-1">
            <Skeleton variant="text" className="w-full" />
            <Skeleton variant="text" className="w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for stories row item
 */
export function StorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-1">
      <Skeleton variant="circular" className="w-16 h-16" />
      <Skeleton variant="text" className="w-12" />
    </div>
  );
}

/**
 * Skeleton for stories row
 */
export function StoriesRowSkeleton() {
  return (
    <div className="flex gap-4 px-4 py-3 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <StorySkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for comment
 */
export function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-2">
      <Skeleton variant="circular" className="w-8 h-8 flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-16" />
      </div>
    </div>
  );
}

/**
 * Full feed skeleton (stories + posts)
 */
export function FeedSkeleton() {
  return (
    <div>
      <StoriesRowSkeleton />
      {Array.from({ length: 3 }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
