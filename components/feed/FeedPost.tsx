'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Send, Bookmark, MoreHorizontal, BadgeCheck, Star, Volume2, VolumeX, Loader2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import { LiveCommentOverlay } from './LiveCommentOverlay';

interface CommentData {
  id: string;
  text: string;
  createdAt: string;
  starCount: number;
  starred: boolean;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatar: string | null;
    isVerified: boolean;
  };
}

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
  const { data: session } = useSession();
  const [sparked, setSparked] = useState(post.sparked || false);
  const [sparkCount, setSparkCount] = useState(post.sparkCount || 0);
  const [saved, setSaved] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect video aspect ratio from metadata
  const detectVideoAspectRatio = () => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      if (videoWidth && videoHeight) {
        const ratio = videoWidth / videoHeight;
        // Landscape video (wider than 1:1)
        if (ratio > 1.1) {
          setVideoAspectRatio('16/9');
        }
        // Portrait video (taller than 1:1)
        else if (ratio < 0.9) {
          setVideoAspectRatio('9/16');
        }
        // Square-ish video
        else {
          setVideoAspectRatio('1/1');
        }
      }
    }
  };

  // Comment states
  const [showAllComments, setShowAllComments] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [hasFetchedComments, setHasFetchedComments] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const contentUrl = post.contentUrl || post.thumbnailUrl;
  const isVideo = isVideoUrl(contentUrl);

  // Sort comments by star count (most starred first), then by date as fallback
  const sortedComments = [...comments].sort((a, b) => {
    if (b.starCount !== a.starCount) return b.starCount - a.starCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const previewComments = sortedComments.slice(0, 2);
  const hasMoreComments = comments.length > 2;

  const fetchComments = async () => {
    if (hasFetchedComments || loadingComments) return;
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/comments?postId=${post.id}`);
      const data = await response.json();
      if (response.ok) {
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
      setHasFetchedComments(true);
    }
  };

  // Fetch comments automatically on mount to show top comments
  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const handlePostComment = async () => {
    if (!commentText.trim() || postingComment) return;

    setPostingComment(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, text: commentText.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.comment) {
        setComments((prev) => [data.comment, ...prev]);
        setCommentText('');
        setShowAllComments(true);
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setPostingComment(false);
    }
  };

  const handleCommentClick = () => {
    setShowAllComments(true);
    fetchComments(); // Lazy load comments on first interaction
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deletingCommentId) return;

    setDeletingCommentId(commentId);
    try {
      const response = await fetch('/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });

      if (response.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleStarComment = async (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    const wasStarred = comment.starred;

    // Optimistic update
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, starred: !wasStarred, starCount: wasStarred ? c.starCount - 1 : c.starCount + 1 }
          : c
      )
    );

    try {
      const response = await fetch('/api/comments/like', {
        method: wasStarred ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });

      if (!response.ok) {
        // Revert on error
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, starred: wasStarred, starCount: wasStarred ? c.starCount + 1 : c.starCount - 1 }
              : c
          )
        );
      }
    } catch (error) {
      // Revert on error
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, starred: wasStarred, starCount: wasStarred ? c.starCount + 1 : c.starCount - 1 }
            : c
        )
      );
      console.error('Failed to star comment:', error);
    }
  };

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
    <article ref={containerRef} className="border-b border-gray-800 pb-4 mb-3">
      {/* Media Content with Overlayed Header */}
      <div
        className="relative w-full bg-black"
        onDoubleClick={handleDoubleTap}
      >
        {/* Header Overlay */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          }}
        >
          <Link href={`/profile/${post.user.username}`} className="flex items-center gap-2">
            <Avatar className="h-7 w-7 ring-[1.5px] ring-green-500">
              <AvatarImage src={post.user.avatar || undefined} alt={post.user.username || ''} />
              <AvatarFallback className="bg-gray-700 text-white text-xs">
                {post.user.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1">
              <span className="font-medium text-white text-sm">
                {post.user.username}
              </span>
              {post.user.isVerified && (
                <BadgeCheck className="h-4 w-4 text-purple-500 fill-purple-500" />
              )}
              <span className="text-gray-400 text-sm">
                &middot; {formatTimeAgo(post.createdAt)}
              </span>
            </div>
          </Link>
          <button className="text-white p-1">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
        {contentUrl && !imageError ? (
          isVideo ? (
            <div
              className="relative w-full cursor-pointer bg-black max-h-[450px] lg:max-h-[600px]"
              style={{ aspectRatio: videoAspectRatio || '16/9' }}
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
                  loading="lazy"
                />
              )}
              {/* Loading indicator when no thumbnail */}
              {!post.thumbnailUrl && !videoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              )}
              {/* Video - only preload metadata, full video loads when in view */}
              <video
                ref={videoRef}
                src={contentUrl}
                className={`absolute inset-0 w-full h-full object-contain ${post.thumbnailUrl ? (videoLoaded ? 'opacity-100' : 'opacity-0') : 'opacity-100'}`}
                loop
                muted
                playsInline
                preload={isInView ? "auto" : "metadata"}
                autoPlay={!post.thumbnailUrl && isInView}
                onLoadedMetadata={detectVideoAspectRatio}
                onCanPlay={() => {
                  setVideoLoaded(true);
                  detectVideoAspectRatio();
                }}
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
            <div className="relative w-full max-h-[450px] lg:max-h-[600px]" style={{ aspectRatio: imageAspectRatio || '4/5' }}>
              <Image
                src={contentUrl}
                alt={post.title || 'Post'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
                onError={() => setImageError(true)}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (img.naturalWidth && img.naturalHeight) {
                    const ratio = img.naturalWidth / img.naturalHeight;
                    // Landscape
                    if (ratio > 1.1) {
                      setImageAspectRatio('16/9');
                    }
                    // Instagram portrait (4:5 = 0.8)
                    else if (ratio >= 0.75 && ratio <= 0.85) {
                      setImageAspectRatio('4/5');
                    }
                    // Tall portrait (9:16 = 0.5625)
                    else if (ratio < 0.75) {
                      setImageAspectRatio('9/16');
                    }
                    // Square
                    else if (ratio >= 0.9 && ratio <= 1.1) {
                      setImageAspectRatio('1/1');
                    }
                    // Default to 4/5 for anything in between
                    else {
                      setImageAspectRatio('4/5');
                    }
                  }
                }}
              />
            </div>
          )
        ) : (
          <div className="w-full aspect-square bg-gray-900 flex items-center justify-center">
            <span className="text-gray-500">No media</span>
          </div>
        )}

        {/* TikTok-style Live Comment Overlay - Only shows when post is visible */}
        <LiveCommentOverlay comments={previewComments} isVisible={isInView} />
      </div>

      {/* Action Buttons */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Like Button - Star */}
            <button
              onClick={handleSpark}
              className="flex items-center justify-center transition-transform active:scale-125"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  sparked
                    ? 'text-purple-500 fill-purple-500'
                    : 'text-white hover:text-gray-300'
                }`}
              />
            </button>

            {/* Comment Button */}
            <button
              onClick={handleCommentClick}
              className="flex items-center justify-center text-white hover:text-gray-300"
            >
              <MessageCircle className="h-6 w-6" />
            </button>

            {/* Share Button */}
            <button className="flex items-center justify-center text-white hover:text-gray-300">
              <Send className="h-6 w-6" />
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={() => setSaved(!saved)}
            className="flex items-center justify-center text-white hover:text-gray-300"
          >
            <Bookmark
              className={`h-6 w-6 ${saved ? 'fill-white' : ''}`}
            />
          </button>
        </div>

        {/* Star Count */}
        {sparkCount > 0 && (
          <div className="mt-2">
            <span className="font-semibold text-white text-sm">
              {sparkCount.toLocaleString()} star{sparkCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Caption */}
        {(post.title || post.description) && (
          <div className="mt-1">
            <span className="text-white text-sm">
              <Link href={`/profile/${post.user.username}`} className="font-semibold mr-1">
                {post.user.username}
              </Link>
              {post.title || post.description}
            </span>
          </div>
        )}

        {/* Comments Section - Always show top 2, expand on click */}
        {(previewComments.length > 0 || showAllComments) && (
          <div className="mt-3 border-t border-gray-800 pt-3">
            {/* Comments List */}
            {loadingComments ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            ) : (showAllComments ? sortedComments : previewComments).length > 0 ? (
              <div className={`space-y-3 ${showAllComments ? 'max-h-48 overflow-y-auto' : ''}`}>
                {(showAllComments ? sortedComments : previewComments).map((comment) => (
                  <div key={comment.id} className="flex gap-2 group">
                    <Link href={`/profile/${comment.user.username}`}>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={comment.user.avatar || undefined} />
                        <AvatarFallback className="bg-gray-700 text-white text-xs">
                          {comment.user.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1">
                      <p className="text-sm">
                        <Link href={`/profile/${comment.user.username}`} className="font-semibold text-white mr-1">
                          {comment.user.username}
                        </Link>
                        <span className="text-gray-300">{comment.text}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                        {comment.starCount > 0 && (
                          <span className="text-xs text-gray-500">
                            {comment.starCount} {comment.starCount === 1 ? 'star' : 'stars'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStarComment(comment.id)}
                        className="p-1"
                      >
                        <Star
                          className={`h-4 w-4 transition-colors ${
                            comment.starred
                              ? 'text-purple-500 fill-purple-500'
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        />
                      </button>
                      {session?.user?.id === comment.user.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingCommentId === comment.id}
                          className="text-gray-500 hover:text-red-500 p-1"
                        >
                          {deletingCommentId === comment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {/* Show "View all comments" link if there are more */}
                {!showAllComments && hasMoreComments && (
                  <button
                    onClick={handleCommentClick}
                    className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
                  >
                    View all {comments.length} comments
                  </button>
                )}
              </div>
            ) : showAllComments ? (
              <p className="text-gray-500 text-sm text-center py-2">No comments yet</p>
            ) : null}
          </div>
        )}

        {/* Comment Input */}
        <div
          className="mt-2 flex items-center gap-2"
          onClick={() => !showAllComments && handleCommentClick()}
        >
          {showAllComments ? (
            <>
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
              {commentText.trim() && (
                <button
                  onClick={handlePostComment}
                  disabled={postingComment}
                  className="text-purple-500 font-semibold text-sm disabled:opacity-50"
                >
                  {postingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
                </button>
              )}
            </>
          ) : (
            <span className="text-gray-500 text-sm cursor-pointer">Add a comment...</span>
          )}
        </div>
      </div>
    </article>
  );
}
