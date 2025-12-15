'use client';

import React, { useEffect, useState } from 'react';
import { UserStreamCard } from './UserStreamCard';
import { MobileStreamCard } from './MobileStreamCard';
import { Radio } from 'lucide-react';
import { TIME, MOBILE_TABS } from '@/lib/constants';
import type { Stream } from '@/lib/types/stream';

// Demo streams for testing/preview
const DEMO_STREAMS: Stream[] = [
  {
    id: 'demo-1',
    roomName: 'demo-sarah',
    title: 'Late night coding session',
    category: 'IRL',
    isLive: true,
    viewerCount: 1247,
    startedAt: new Date().toISOString(),
    user: {
      id: 'demo-user-1',
      username: 'sarahcodes',
      displayName: 'Sarah',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      isOnline: true,
    },
  },
  {
    id: 'demo-2',
    roomName: 'demo-mike',
    title: 'Fortnite ranked grind',
    category: 'Gaming',
    isLive: true,
    viewerCount: 892,
    startedAt: new Date().toISOString(),
    user: {
      id: 'demo-user-2',
      username: 'mikeplays',
      displayName: 'Mike',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
      isOnline: true,
    },
  },
  {
    id: 'demo-3',
    roomName: 'demo-luna',
    title: 'Lo-fi beats & chill vibes',
    category: 'Music',
    isLive: true,
    viewerCount: 2103,
    startedAt: new Date().toISOString(),
    user: {
      id: 'demo-user-3',
      username: 'lunasounds',
      displayName: 'Luna',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna',
      isOnline: true,
    },
  },
  {
    id: 'demo-4',
    roomName: 'demo-alex',
    title: 'NYC street photography walk',
    category: 'IRL',
    isLive: true,
    viewerCount: 567,
    startedAt: new Date().toISOString(),
    user: {
      id: 'demo-user-4',
      username: 'alexshots',
      displayName: 'Alex',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
      isOnline: true,
    },
  },
  {
    id: 'demo-5',
    roomName: 'demo-jade',
    title: 'Valorant with viewers',
    category: 'Gaming',
    isLive: true,
    viewerCount: 1834,
    startedAt: new Date().toISOString(),
    user: {
      id: 'demo-user-5',
      username: 'jadegaming',
      displayName: 'Jade',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jade',
      isOnline: true,
    },
  },
  {
    id: 'demo-6',
    roomName: 'demo-marcus',
    title: 'Guitar practice & requests',
    category: 'Music',
    isLive: true,
    viewerCount: 421,
    startedAt: new Date().toISOString(),
    user: {
      id: 'demo-user-6',
      username: 'marcusmusic',
      displayName: 'Marcus',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus',
      isOnline: true,
    },
  },
];

// Unified streaming model: all streams come from the database
// Each user = 1 stream room (user-{userId})
// This includes both real users and AI streamers
export function LiveStreamGrid() {
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
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

    // Refresh periodically for quicker stream discovery
    const interval = setInterval(fetchLiveStreams, TIME.STREAM_POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Use demo streams if no real streams are live
  const streamsToShow = liveStreams.length > 0 ? liveStreams : DEMO_STREAMS;

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
        <div className="grid grid-cols-2 gap-2 px-2 pt-3 pb-24">
          {streamsToShow
            .filter((stream) => {
              // For You and Popular show all streams
              if (activeTab === 'For You' || activeTab === 'Popular') return true;
              // Filter by category for IRL, Gaming, Music tabs
              return stream.category === activeTab;
            })
            .map((stream) => (
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
            {streamsToShow.length}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {streamsToShow.map((stream) => (
            <UserStreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      </section>
    </>
  );
}
