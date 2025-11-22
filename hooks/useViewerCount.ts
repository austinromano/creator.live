'use client';
import { useState, useEffect } from 'react';

interface UseViewerCountProps {
  isLive: boolean;
  initialCount?: number;
}

export function useViewerCount({ isLive, initialCount = 0 }: UseViewerCountProps) {
  const [viewerCount, setViewerCount] = useState(initialCount);

  useEffect(() => {
    if (!isLive) {
      setViewerCount(0);
      return;
    }

    // Simulate viewer count changes when live
    const interval = setInterval(() => {
      setViewerCount(prevCount => {
        // Simulate natural viewer fluctuation
        const change = Math.random() > 0.5 ? 
          Math.floor(Math.random() * 5) + 1 : // +1 to +5 viewers
          -(Math.floor(Math.random() * 3) + 1); // -1 to -3 viewers
        
        const newCount = Math.max(0, prevCount + change);
        
        // Keep viewer count in a reasonable range (0-500 for demo)
        return Math.min(newCount, 500);
      });
    }, 3000 + Math.random() * 7000); // Update every 3-10 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  return viewerCount;
}