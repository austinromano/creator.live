'use client';
import React, { useEffect, useState } from 'react';
import { UserStreamCard } from './UserStreamCard';
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

// Unified streaming model: all streams come from the database
// Each user = 1 stream room (user-{userId})
// This includes both real users and AI streamers
export function LiveStreamGrid() {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);

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
    <section className="mb-8">
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
  );
}
