'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, Image as ImageIcon, Video, Lock, DollarSign, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

type PostType = 'free' | 'paid';
type MediaType = 'image' | 'video';

export function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [postType, setPostType] = useState<PostType>('free');
  const [price, setPrice] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Please select an image or video file');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be under 50MB');
      return;
    }

    setError(null);
    setMediaFile(file);
    setMediaType(isImage ? 'image' : 'video');

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        handleFileSelect({ target: input } as any);
      }
    }
  }, [handleFileSelect]);

  const handleSubmit = async () => {
    if (!mediaFile) {
      setError('Please select a file to upload');
      return;
    }

    if (postType === 'paid' && (!price || parseFloat(price) <= 0)) {
      setError('Please set a price for paid content');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', mediaFile);
      formData.append('type', postType);
      formData.append('title', title);
      if (postType === 'paid') {
        formData.append('price', price);
      }

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create post');
      }

      // Success - close modal and refresh
      onPostCreated?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Cleanup preview URL
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    // Reset state
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setPostType('free');
    setPrice('');
    setTitle('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[#1a1a1d] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Create Post</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Media Upload Area */}
          {!mediaPreview ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">
                Drag and drop or click to upload
              </p>
              <p className="text-gray-600 text-sm">
                Images or videos up to 50MB
              </p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1 text-gray-500">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm">Images</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Video className="h-4 w-4" />
                  <span className="text-sm">Videos</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative aspect-[3/4] max-h-[300px] w-full rounded-xl overflow-hidden bg-black">
              {mediaType === 'image' ? (
                <Image
                  src={mediaPreview}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              ) : (
                <video
                  src={mediaPreview}
                  className="w-full h-full object-contain"
                  controls
                />
              )}
              <button
                onClick={() => {
                  URL.revokeObjectURL(mediaPreview);
                  setMediaPreview(null);
                  setMediaFile(null);
                  setMediaType(null);
                }}
                className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          )}

          {/* Title Input */}
          <input
            type="text"
            placeholder="Add a title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            maxLength={100}
          />

          {/* Post Type Selection */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Visibility</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPostType('free')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  postType === 'free'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                <span className="font-medium">Free</span>
              </button>
              <button
                onClick={() => setPostType('paid')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  postType === 'paid'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <Lock className="h-4 w-4" />
                <span className="font-medium">Paid</span>
              </button>
            </div>
          </div>

          {/* Price Input (for paid posts) */}
          {postType === 'paid' && (
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Price (USD)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <Button
            onClick={handleSubmit}
            disabled={!mediaFile || isUploading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading...
              </span>
            ) : (
              'Post'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
