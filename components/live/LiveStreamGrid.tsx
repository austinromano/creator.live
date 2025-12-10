'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { UserStreamCard } from './UserStreamCard';
import { MobileStreamCard } from './MobileStreamCard';
import { Radio } from 'lucide-react';

interface LiveStream {
  id: string;
  roomName: string;
  title: string;
  isLive: boolean;
  viewerCount: number;
  startedAt: string | null;
  user: {
    id: string;
    username: string | null;
    avatar: string | null;
    walletAddress: string | null;
  };
}

const MOBILE_TABS = ['For You', 'Popular', 'New', 'IRL', 'Gaming', 'Music'];

// Unified streaming model: all streams come from the database
// Each user = 1 stream room (user-{userId})
// This includes both real users and AI streamers
export function LiveStreamGrid() {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [activeTab, setActiveTab] = useState('For You');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isTransitioning) return;
    touchStartX.current = e.touches[0].clientX;
    setSwipeOffset(0);
  }, [isTransitioning]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartX.current || isTransitioning) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    // Limit the swipe offset for a rubber-band effect
    setSwipeOffset(diff * 0.3);
  }, [isTransitioning]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || isTransitioning) return;

    const minSwipeDistance = 50;

    if (Math.abs(swipeOffset) > minSwipeDistance * 0.3) {
      const currentIndex = MOBILE_TABS.indexOf(activeTab);

      if (swipeOffset < 0 && currentIndex < MOBILE_TABS.length - 1) {
        // Swipe left - go to next tab
        setIsTransitioning(true);
        setSwipeOffset(-100);
        setTimeout(() => {
          setActiveTab(MOBILE_TABS[currentIndex + 1]);
          setSwipeOffset(0);
          setIsTransitioning(false);
        }, 200);
      } else if (swipeOffset > 0 && currentIndex > 0) {
        // Swipe right - go to previous tab
        setIsTransitioning(true);
        setSwipeOffset(100);
        setTimeout(() => {
          setActiveTab(MOBILE_TABS[currentIndex - 1]);
          setSwipeOffset(0);
          setIsTransitioning(false);
        }, 200);
      } else {
        // Snap back
        setSwipeOffset(0);
      }
    } else {
      // Snap back
      setSwipeOffset(0);
    }

    touchStartX.current = null;
  }, [activeTab, swipeOffset, isTransitioning]);

  // Fetch all live streams from database
  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        const response = await fetch('/api/streams/live');
        if (response.ok) {
          const data = await response.json();
          setLiveStreams(data.streams || []);
        }
      } catch (error) {
        console.error('Failed to fetch live streams:', error);
      }
    };

    fetchLiveStreams();

    // Refresh every 5 seconds for quicker stream discovery
    const interval = setInterval(fetchLiveStreams, 5000);
    return () => clearInterval(interval);
  }, []);

  if (liveStreams.length === 0) {
    return null;
  }

  return (
    <>
      {/* ========== MOBILE VIEW (< lg) ========== */}
      <section className="lg:hidden">
        {/* Category Tabs */}
        <div className="flex justify-between items-center px-4 py-2">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap text-base font-medium pb-1 transition-colors ${
                activeTab === tab
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Two Column Grid Layout */}
        <div
          ref={contentRef}
          className="grid grid-cols-2 gap-3 px-3 pt-3 pb-24 transition-transform"
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transitionDuration: isTransitioning ? '200ms' : '0ms',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {liveStreams.map((stream) => (
            <MobileStreamCard
              key={stream.id}
              stream={stream}
              size="medium"
            />
          ))}
        </div>
      </section>

      {/* ========== DESKTOP VIEW (>= lg) ========== */}
      <section className="hidden lg:block mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Radio className="h-6 w-6 text-red-500 animate-pulse" />
          <h2 className="text-2xl font-bold text-white">Trending Now</h2>
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            {liveStreams.length}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {liveStreams.map((stream) => (
            <UserStreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      </section>
    </>
  );
}
