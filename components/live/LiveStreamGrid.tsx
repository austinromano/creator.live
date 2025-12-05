'use client';
import React, { useEffect, useState } from 'react';
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
    isAI?: boolean;
  };
}

const MOBILE_TABS = ['For You', 'Popular', 'New', 'IRL', 'Gaming', 'Music'];

// Unified streaming model: all streams come from the database
// Each user = 1 stream room (user-{userId})
// This includes both real users and AI streamers
export function LiveStreamGrid() {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [activeTab, setActiveTab] = useState('For You');

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

  // Split streams for mobile layout - AI streamers vs regular
  const aiStreams = liveStreams.filter(s => s.user.isAI);
  const regularStreams = liveStreams.filter(s => !s.user.isAI);
  // If no AI flag, just split evenly for the two-column layout
  const leftColumn = regularStreams.length > 0 ? regularStreams : liveStreams.slice(0, Math.ceil(liveStreams.length / 2));
  const rightColumn = aiStreams.length > 0 ? aiStreams : liveStreams.slice(Math.ceil(liveStreams.length / 2));

  return (
    <>
      {/* ========== MOBILE VIEW (< lg) ========== */}
      <section className="lg:hidden">
        {/* Category Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide gap-4 px-4 py-3 border-b border-gray-800">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap text-sm font-medium pb-2 transition-colors ${
                activeTab === tab
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="flex gap-3 px-3 py-4">
          {/* Left Column - Trending Live */}
          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-bold text-white">Trending Live</h3>
            {leftColumn.map((stream, index) => (
              <MobileStreamCard
                key={stream.id}
                stream={stream}
                size={index === 0 ? 'large' : 'medium'}
              />
            ))}
          </div>

          {/* Right Column - AI Streamer Spotlight */}
          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-bold text-purple-400 invisible">Spotlight</h3>
            {rightColumn.map((stream, index) => (
              <MobileStreamCard
                key={stream.id}
                stream={stream}
                variant="ai"
                size={index === 0 ? 'large' : 'medium'}
                showSpotlightText={index === 0}
              />
            ))}
          </div>
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
