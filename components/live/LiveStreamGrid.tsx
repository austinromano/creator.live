'use client';

import React, { useEffect, useState } from 'react';
import { UserStreamCard } from './UserStreamCard';
import { MobileStreamCard } from './MobileStreamCard';
import { Radio } from 'lucide-react';
import { TIME, MOBILE_TABS } from '@/lib/constants';
import type { Stream } from '@/lib/types/stream';

// Demo streams for display purposes
const DEMO_STREAMS: Stream[] = [
  {
    id: 'demo-1',
    roomName: 'demo-1',
    user: {
      username: 'sarah_music',
      displayName: 'Sarah Johnson',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    title: 'Chill vibes and acoustic covers 🎸',
    category: 'Music',
    viewerCount: 1234,
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&h=600&fit=crop',
  },
  {
    id: 'demo-2',
    roomName: 'demo-2',
    user: {
      username: 'gamer_pro',
      displayName: 'Alex Chen',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    title: 'Valorant Ranked - Road to Radiant!',
    category: 'Gaming',
    viewerCount: 3456,
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop',
  },
  {
    id: 'demo-3',
    roomName: 'demo-3',
    user: {
      username: 'travel_kate',
      displayName: 'Kate Wilson',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    title: 'Exploring Tokyo Streets 🗾',
    category: 'IRL',
    viewerCount: 892,
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop',
  },
  {
    id: 'demo-4',
    roomName: 'demo-4',
    user: {
      username: 'dj_mike',
      displayName: 'Mike Rodriguez',
      avatar: 'https://i.pravatar.cc/150?img=13',
    },
    title: 'House Mix Session - Feel Good Friday',
    category: 'Music',
    viewerCount: 2156,
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800&h=600&fit=crop',
  },
  {
    id: 'demo-5',
    roomName: 'demo-5',
    user: {
      username: 'chef_emma',
      displayName: 'Emma Davis',
      avatar: 'https://i.pravatar.cc/150?img=9',
    },
    title: 'Making Homemade Pasta From Scratch 🍝',
    category: 'IRL',
    viewerCount: 567,
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop',
  },
  {
    id: 'demo-6',
    roomName: 'demo-6',
    user: {
      username: 'fps_legend',
      displayName: 'Jake Morrison',
      avatar: 'https://i.pravatar.cc/150?img=14',
    },
    title: 'CS2 - Competitive Gameplay',
    category: 'Gaming',
    viewerCount: 4523,
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&h=600&fit=crop',
  },
  {
    id: 'demo-7',
    roomName: 'demo-7',
    user: {
      username: 'yoga_lily',
      displayName: 'Lily Anderson',
      avatar: 'https://i.pravatar.cc/150?img=10',
    },
    title: 'Morning Yoga Flow - Join Me! 🧘‍♀️',
    category: 'IRL',
    viewerCount: 678,
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
  },
  {
    id: 'demo-8',
    roomName: 'demo-8',
    user: {
      username: 'artist_noah',
      displayName: 'Noah Taylor',
      avatar: 'https://i.pravatar.cc/150?img=15',
    },
    title: 'Digital Art Stream - Character Design',
    category: 'IRL',
    viewerCount: 1089,
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=600&fit=crop',
  },
] as any;

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
        {/* Live Navbar - At Top */}
        <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-t from-black/20 via-black/10 to-transparent backdrop-blur-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative whitespace-nowrap text-sm font-bold pb-2 transition-all drop-shadow-[0_0_8px_rgba(0,0,0,1)] ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-[gradient_6s_ease_infinite] drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]'
                  : 'text-white hover:text-purple-300'
              }`}
              style={activeTab === tab ? { backgroundSize: '200% 200%' } : undefined}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Two Column Grid Layout */}
        <div className="grid grid-cols-2 gap-2 px-2 pt-1 pb-24">
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
