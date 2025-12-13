'use client';
import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { LiveStreamPage } from '@/components/pages/LiveStreamPage';
import { createStreamCreator } from '@/lib/types';

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

  // Create a StreamCreator for the LiveStreamPage
  const streamCreator = createStreamCreator({
    userId: userStream.user.id,
    username: userStream.user.username,
    avatar: userStream.user.avatar,
    roomName: userStream.roomName,
    title: userStream.title,
    isLive: true,
    viewers: 0,
  });

  return <LiveStreamPage creator={streamCreator} />;
}
