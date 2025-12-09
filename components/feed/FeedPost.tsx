'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Send, Bookmark, MoreHorizontal, BadgeCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface FeedPostData {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  contentUrl: string | null;
  price: number | null;
  viewerCount: number;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatar: string | null;
    isVerified: boolean;
  };
}

interface FeedPostProps {
  post: FeedPostData;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return `${Math.floor(diffInSeconds / 604800)}w`;
}

function isVideoUrl(url: string | null): boolean {
  if (!url) return false;
  return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('video');
}

export function FeedPost({ post }: FeedPostProps) {
  const [sparked, setSparked] = useState(false);
  const [sparkCount, setSparkCount] = useState(post.viewerCount || 0);
  const [saved, setSaved] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSpark = async () => {
    if (sparked) {
      setSparkCount((prev) => prev - 1);
      setSparked(false);

      // Remove notification when unsparking
      try {
        await fetch('/api/notifications', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUserId: post.user.id,
            type: 'spark',
            postId: post.id,
          }),
        });
      } catch (error) {
        console.error('Failed to remove spark notification:', error);
      }
    } else {
      setSparkCount((prev) => prev + 1);
      setSparked(true);

      // Send notification to post owner
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUserId: post.user.id,
            type: 'spark',
            postId: post.id,
          }),
        });
      } catch (error) {
        console.error('Failed to send spark notification:', error);
      }
    }
  };

  const handleDoubleTap = async () => {
    if (!sparked) {
      setSparked(true);
      setSparkCount((prev) => prev + 1);

      // Send notification to post owner
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUserId: post.user.id,
            type: 'spark',
            postId: post.id,
          }),
        });
      } catch (error) {
        console.error('Failed to send spark notification:', error);
      }
    }
  };

  const contentUrl = post.contentUrl || post.thumbnailUrl;
  const isVideo = isVideoUrl(contentUrl);

  return (
    <article className="border-b border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={`/profile/${post.user.username}`} className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ring-2 ring-purple-500/50">
            <AvatarImage src={post.user.avatar || undefined} alt={post.user.username || ''} />
            <AvatarFallback className="bg-gray-700 text-white">
              {post.user.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-white text-sm">
              {post.user.username}
            </span>
            {post.user.isVerified && (
              <BadgeCheck className="h-4 w-4 text-purple-500 fill-purple-500" />
            )}
            <span className="text-gray-500 text-sm">
              &middot; {formatTimeAgo(post.createdAt)}
            </span>
          </div>
        </Link>
        <button className="text-white p-2">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Media Content */}
      <div
        className="relative w-full bg-black"
        onDoubleClick={handleDoubleTap}
      >
        {contentUrl && !imageError ? (
          isVideo ? (
            <video
              src={contentUrl}
              className="w-full max-h-[600px] object-contain"
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
              <Image
                src={contentUrl}
                alt={post.title || 'Post'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
                onError={() => setImageError(true)}
              />
            </div>
          )
        ) : (
          <div className="w-full aspect-square bg-gray-900 flex items-center justify-center">
            <span className="text-gray-500">No media</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Spark Button - Star with plus */}
            <button
              onClick={handleSpark}
              className="transition-transform active:scale-125 flex items-center justify-center"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-7 w-7 transition-colors ${
                  sparked
                    ? 'text-purple-400'
                    : 'text-white hover:text-gray-300'
                }`}
                fill={sparked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                {/* 4-pointed star */}
                <path
                  d="M12 3L13.5 9.5L20 11L13.5 12.5L12 19L10.5 12.5L4 11L10.5 9.5L12 3Z"
                  strokeLinejoin="round"
                />
                {/* Plus sign in top right */}
                <line x1="19" y1="2" x2="19" y2="6" strokeLinecap="round" />
                <line x1="17" y1="4" x2="21" y2="4" strokeLinecap="round" />
              </svg>
            </button>

            {/* Comment Button */}
            <button className="text-white hover:text-gray-300">
              <MessageCircle className="h-7 w-7" />
            </button>

            {/* Share Button */}
            <button className="text-white hover:text-gray-300">
              <Send className="h-7 w-7" />
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={() => setSaved(!saved)}
            className="text-white hover:text-gray-300"
          >
            <Bookmark
              className={`h-7 w-7 ${saved ? 'fill-white' : ''}`}
            />
          </button>
        </div>

        {/* Spark Count */}
        {sparkCount > 0 && (
          <div className="mt-2">
            <span className="font-semibold text-white text-sm">
              {sparkCount.toLocaleString()} spark{sparkCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Caption */}
        {(post.title || post.description) && (
          <div className="mt-2">
            <span className="text-white text-sm">
              <Link href={`/profile/${post.user.username}`} className="font-semibold mr-2">
                {post.user.username}
              </Link>
              {post.title || post.description}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
