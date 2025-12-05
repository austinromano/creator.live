'use client';
import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { LiveStreamPage } from '@/components/pages/LiveStreamPage';
import { Creator } from '@/lib/types';

interface LivePageProps {
  params: Promise<{
    symbol: string;
  }>;
}

interface UserStreamData {
  id: string;
  roomName: string;
  title: string;
  user: {
    id: string;
    username: string | null;
    avatar: string | null;
  };
}

export default function LivePage({ params }: LivePageProps) {
  const resolvedParams = React.use(params);
  const [userStream, setUserStream] = useState<UserStreamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStream = async () => {
      const roomName = resolvedParams.symbol;

      // Fetch user stream data - all streams are user-based now
      try {
        const response = await fetch('/api/streams/live');
        if (response.ok) {
          const data = await response.json();
          const stream = data.streams?.find((s: any) => s.roomName === roomName);
          if (stream) {
            setUserStream(stream);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch user stream:', error);
      }

      // If not found as live stream, still allow viewing (user might go live)
      // Create a placeholder user stream
      const userId = roomName.startsWith('user-') ? roomName.replace('user-', '') : roomName;
      setUserStream({
        id: roomName,
        roomName: roomName,
        title: 'Live Stream',
        user: {
          id: userId,
          username: null,
          avatar: null,
        },
      });
      setLoading(false);
    };

    loadStream();
  }, [resolvedParams.symbol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (!userStream) {
    notFound();
  }

  // Create a Creator object for the LiveStreamPage
  const userAsCreator: Creator = {
    id: userStream.user.id,
    name: userStream.user.username || 'Anonymous',
    symbol: userStream.roomName, // Use room name as symbol for LiveKit connection
    description: userStream.title,
    avatar: userStream.user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg',
    price: 0,
    marketCap: 0,
    volume24h: 0,
    priceChange24h: 0,
    bondingCurve: 0,
    liquidity: 0,
    holders: 0,
    transactions: 0,
    isLive: true,
    viewers: 0,
    created: new Date().toISOString(),
  };

  return <LiveStreamPage creator={userAsCreator} />;
}
