'use client';
import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { LiveStreamPage } from '@/components/pages/LiveStreamPage';
import { useTokenStore } from '@/stores/tokenStore';
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
  const { getTokenBySymbol, fetchTokens, initialized, tokens } = useTokenStore();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [userStream, setUserStream] = useState<UserStreamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStream = async () => {
      const roomName = resolvedParams.symbol;

      // Check if this is a user-based room name (starts with "user-")
      if (roomName.startsWith('user-')) {
        // Fetch user stream data
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
        const userId = roomName.replace('user-', '');
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
        return;
      }

      // Token-based room name - look up token
      if (!initialized) {
        await fetchTokens();
      }

      const token = getTokenBySymbol(roomName);
      setCreator(token || null);
      setLoading(false);
    };

    loadStream();
  }, [resolvedParams.symbol, initialized, fetchTokens, getTokenBySymbol]);

  // Also update when tokens change (in case fetchTokens completes)
  useEffect(() => {
    if (initialized && !resolvedParams.symbol.startsWith('user-')) {
      const token = getTokenBySymbol(resolvedParams.symbol);
      setCreator(token || null);
      setLoading(false);
    }
  }, [tokens, initialized, resolvedParams.symbol, getTokenBySymbol]);

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

  // Handle user-based streams
  if (userStream) {
    // Create a fake Creator object for the LiveStreamPage
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

  if (!creator) {
    notFound();
  }

  // Allow viewing even if not marked as live - the StreamPlayer will show
  // "Waiting for broadcaster" if no stream is available. This enables
  // viewers to wait for a stream to start.
  // Force isLive to true so StreamPlayer attempts connection
  const creatorWithLive = { ...creator, isLive: true };

  return <LiveStreamPage creator={creatorWithLive} />;
}
