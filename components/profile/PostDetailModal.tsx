'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Trash2, Lock, Loader2, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ContentGridItem } from './ContentGrid';

function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('video');
}

interface PostDetailModalProps {
  post: ContentGridItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (postId: string) => void;
  isOwnPost?: boolean;
}

export function PostDetailModal({
  post,
  isOpen,
  onClose,
  onDelete,
  isOwnPost = false,
}: PostDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Try to play with sound when modal opens (user already interacted by tapping)
  useEffect(() => {
    if (isOpen && videoRef.current) {
      const video = videoRef.current;
      video.muted = false;
      setIsMuted(false);

      video.play().catch(() => {
        // If autoplay with sound fails, fallback to muted
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    }
  }, [isOpen, post?.id]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsMuted(false);
      setIsPlaying(true);
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen || !post) return null;

  const isLocked = post.type === 'locked' || post.type === 'paid';
  const isVideo = isVideoUrl(post.contentUrl);
  const mediaUrl = post.contentUrl || post.thumbnailUrl;

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

  const handleDelete = async () => {
    if (!post) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete post');
      }

      onDelete?.(post.id);
      onClose();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Post content */}
        <div className={`relative w-full rounded-2xl overflow-hidden bg-[#1a1a1d] ${isVideo ? 'aspect-video' : 'aspect-[3/4]'}`}>
          {isVideo && mediaUrl ? (
            <div className="relative w-full h-full cursor-pointer" onClick={togglePlayPause}>
              <video
                ref={videoRef}
                src={mediaUrl}
                className={`w-full h-full object-contain ${isLocked ? 'blur-xl scale-110' : ''}`}
                loop
                playsInline
                preload="auto"
              />
              {/* Mute/unmute button */}
              {!isLocked && (
                <button
                  onClick={toggleMute}
                  className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5 text-white" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-white" />
                  )}
                </button>
              )}
              {/* Play/pause indicator */}
              {!isPlaying && !isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[20px] border-l-white border-y-[12px] border-y-transparent ml-1" />
                  </div>
                </div>
              )}
            </div>
          ) : post.thumbnailUrl ? (
            <Image
              src={post.thumbnailUrl}
              alt={post.title || ''}
              fill
              className={`object-cover ${isLocked ? 'blur-xl scale-110' : ''}`}
              sizes="(max-width: 768px) 100vw, 500px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-gray-900" />
          )}

          {/* Locked overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center mx-auto mb-3">
                  <Lock className="h-8 w-8 text-gray-300" />
                </div>
                {post.type === 'paid' && post.price && (
                  <>
                    <p className="text-white font-bold text-2xl">${post.price}</p>
                    <p className="text-gray-400 text-sm mt-1">Unlock this post</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Title overlay */}
          {post.title && !isLocked && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-white font-medium">{post.title}</p>
            </div>
          )}
        </div>

        {/* Actions for own posts */}
        {isOwnPost && (
          <div className="mt-4">
            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="ghost"
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </Button>
            ) : (
              <div className="bg-[#1a1a1d] rounded-xl p-4 space-y-3">
                <p className="text-white text-center">
                  Are you sure you want to delete this post?
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="ghost"
                    className="flex-1 text-gray-400 hover:text-white"
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Delete'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
