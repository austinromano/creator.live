'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Send, Bookmark, MoreHorizontal, BadgeCheck, Heart, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface FeedPostData {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  contentUrl: string | null;
  price: number | null;
  sparkCount: number;
  sparked: boolean;
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
  const [sparked, setSparked] = useState(post.sparked || false);
  const [sparkCount, setSparkCount] = useState(post.sparkCount || 0);
  const [saved, setSaved] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const contentUrl = post.contentUrl || post.thumbnailUrl;
  const isVideo = isVideoUrl(contentUrl);

  // Detect when post enters viewport
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Play/pause video based on viewport
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const video = videoRef.current;

    if (isInView && videoLoaded) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isVideo, isInView, videoLoaded]);

  const handleSpark = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const previousSparked = sparked;
    const previousCount = sparkCount;

    // Optimistic update
    if (sparked) {
      setSparked(false);
      setSparkCount((prev) => Math.max(0, prev - 1));
    } else {
      setSparked(true);
      setSparkCount((prev) => prev + 1);
    }

    try {
      const response = await fetch('/api/sparks', {
        method: previousSparked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        // If already sparked, keep sparked state (sync with server)
        if (data.error === 'Already sparked') {
          setSparked(true);
        } else {
          // Revert on other errors
          setSparked(previousSparked);
          setSparkCount(previousCount);
        }
      }
    } catch (error) {
      // Revert on error
      setSparked(previousSparked);
      setSparkCount(previousCount);
      console.error('Failed to update spark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoubleTap = async () => {
    if (!sparked && !isLoading) {
      setIsLoading(true);

      // Optimistic update
      setSparked(true);
      setSparkCount((prev) => prev + 1);

      try {
        const response = await fetch('/api/sparks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id }),
        });

        if (!response.ok) {
          const data = await response.json();
          // If already sparked, keep sparked state (sync with server)
          if (data.error === 'Already sparked') {
            setSparked(true);
            // Revert count since server already has it
            setSparkCount((prev) => Math.max(0, prev - 1));
          } else {
            // Revert on other errors
            setSparked(false);
            setSparkCount((prev) => Math.max(0, prev - 1));
          }
        }
      } catch (error) {
        // Revert on error
        setSparked(false);
        setSparkCount((prev) => Math.max(0, prev - 1));
        console.error('Failed to spark post:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Video controls
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <article ref={containerRef} className="border-b border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1">
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
            <div
              className="relative w-full cursor-pointer bg-black"
              style={{ aspectRatio: '16/9' }}
              onClick={togglePlayPause}
            >
              {/* Thumbnail shows instantly if available */}
              {post.thumbnailUrl && !videoLoaded && (
                <Image
                  src={post.thumbnailUrl}
                  alt={post.title || 'Video thumbnail'}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 600px"
                  priority
                />
              )}
              {/* Loading indicator when no thumbnail */}
              {!post.thumbnailUrl && !videoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              )}
              {/* Video - always render but hide until loaded if we have thumbnail */}
              <video
                ref={videoRef}
                src={contentUrl}
                className={`absolute inset-0 w-full h-full object-contain ${post.thumbnailUrl ? (videoLoaded ? 'opacity-100' : 'opacity-0') : 'opacity-100'}`}
                loop
                muted
                playsInline
                preload="auto"
                autoPlay={!post.thumbnailUrl}
                onCanPlay={() => setVideoLoaded(true)}
              />
              {/* Mute/unmute button */}
              <button
                onClick={toggleMute}
                className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center z-10"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-white" />
                ) : (
                  <Volume2 className="h-4 w-4 text-white" />
                )}
              </button>
              {/* Play/pause indicator */}
              {!isPlaying && videoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[20px] border-l-white border-y-[12px] border-y-transparent ml-1" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full" style={{ aspectRatio: '4/5' }}>
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
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Like Button - Heart */}
            <button
              onClick={handleSpark}
              className="flex items-center justify-center transition-transform active:scale-125"
            >
              <Heart
                className={`h-7 w-7 transition-colors ${
                  sparked
                    ? 'text-red-500 fill-red-500'
                    : 'text-white hover:text-gray-300'
                }`}
              />
            </button>

            {/* Comment Button */}
            <button className="flex items-center justify-center text-white hover:text-gray-300">
              <MessageCircle className="h-7 w-7" />
            </button>

            {/* Share Button */}
            <button className="flex items-center justify-center text-white hover:text-gray-300">
              <Send className="h-7 w-7" />
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={() => setSaved(!saved)}
            className="flex items-center justify-center text-white hover:text-gray-300"
          >
            <Bookmark
              className={`h-7 w-7 ${saved ? 'fill-white' : ''}`}
            />
          </button>
        </div>

        {/* Like Count */}
        {sparkCount > 0 && (
          <div className="mt-2">
            <span className="font-semibold text-white text-sm">
              {sparkCount.toLocaleString()} like{sparkCount !== 1 ? 's' : ''}
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
