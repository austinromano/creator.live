'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LiveComment {
  id: string;
  text: string;
  user: {
    username: string | null;
    avatar: string | null;
  };
  timestamp: number;
}

interface LiveCommentOverlayProps {
  comments: Array<{
    id: string;
    text: string;
    user: {
      username: string | null;
      avatar: string | null;
    };
  }>;
  isVisible?: boolean;
}

export function LiveCommentOverlay({ comments, isVisible = true }: LiveCommentOverlayProps) {
  const [liveComments, setLiveComments] = useState<LiveComment[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const commentIndexRef = useRef(0);

  useEffect(() => {
    // Only show comments when content is visible
    if (!isVisible) {
      setLiveComments([]);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Cycle through comments one at a time when visible - start immediately
    if (comments.length > 0 && !intervalRef.current) {
      // Show first comment immediately
      const firstComment: LiveComment = {
        ...comments[0],
        timestamp: Date.now(),
      };
      setLiveComments([firstComment]);
      commentIndexRef.current = 1;

      // Then cycle through remaining comments, only once
      intervalRef.current = setInterval(() => {
        if (commentIndexRef.current < comments.length) {
          const newComment: LiveComment = {
            ...comments[commentIndexRef.current],
            timestamp: Date.now(),
          };

          setLiveComments((prev) => {
            // Keep max 3 comments visible
            const updated = [newComment, ...prev].slice(0, 3);
            return updated;
          });

          commentIndexRef.current++;
        } else {
          // Stop after showing all comments once
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 2000); // New comment every 2 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [comments, isVisible]);

  // Auto-remove old comments - disappear after 3 seconds
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setLiveComments((prev) =>
        prev.filter((comment) => now - comment.timestamp < 3000)
      );
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  if (!isVisible || liveComments.length === 0) return null;

  return (
    <div className="absolute bottom-16 left-0 right-0 pointer-events-none z-30 px-3">
      <AnimatePresence mode="popLayout">
        {liveComments.map((comment, index) => (
          <motion.div
            key={comment.id}
            initial={{
              opacity: 0,
              y: 30,
              x: -20,
              scale: 0.8,
              rotate: -5
            }}
            animate={{
              opacity: 1,
              y: index * -60,
              x: 0,
              scale: 1,
              rotate: 0
            }}
            exit={{
              opacity: 0,
              x: 100,
              scale: 0.6,
              transition: { duration: 0.4, ease: "easeIn" }
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              mass: 0.8
            }}
            className="mb-2 max-w-[85%]"
          >
            <motion.div
              initial={{
                textShadow: "0 0 0 rgba(168, 85, 247, 0)",
                filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))"
              }}
              animate={{
                textShadow: [
                  "0 0 0 rgba(168, 85, 247, 0)",
                  "0 0 20px rgba(168, 85, 247, 0.6)",
                  "0 0 0 rgba(168, 85, 247, 0)"
                ]
              }}
              transition={{ duration: 1, times: [0, 0.5, 1] }}
              className="flex items-center gap-2.5"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 15,
                  delay: 0.1
                }}
              >
                <Avatar className="h-7 w-7 flex-shrink-0 ring-2 ring-purple-500/50">
                  <AvatarImage src={comment.user.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xs font-bold">
                    {comment.user.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              <motion.div
                className="flex-1 min-w-0"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-white text-sm leading-snug">
                  <span className="font-bold mr-1.5 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {comment.user.username || 'Anonymous'}
                  </span>
                  <span className="text-white/95">{comment.text}</span>
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
