'use client';

import { useState } from 'react';
import { X, Trash2, Lock, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ContentGridItem } from './ContentGrid';

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

  if (!isOpen || !post) return null;

  const isLocked = post.type === 'locked' || post.type === 'paid';

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
        <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#1a1a1d]">
          {post.thumbnailUrl ? (
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
