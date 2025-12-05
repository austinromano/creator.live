'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StreamPlayer } from '@/components/live/StreamPlayer';
import { LiveChat } from '@/components/live/LiveChat';
import { TipButton } from '@/components/live/TipButton';
import { Creator, ChatMessage } from '@/lib/types';
import { useLiveStream } from '@/hooks/useLiveStream';
import { LiveKitStreamer, LiveKitActivityEvent } from '@/lib/livekit-stream';
import { useSession } from 'next-auth/react';
import {
  Eye,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Heart,
  Share2,
  MoreVertical,
  Star,
  UserPlus,
  UserCheck
} from 'lucide-react';

interface LiveStreamPageProps {
  creator: Creator;
}

export function LiveStreamPage({ creator }: LiveStreamPageProps) {
  const { messages, viewers, isLive, setIsLive, addMessage, sendTip } = useLiveStream(creator.symbol);
  const { data: session } = useSession();
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [streamer, setStreamer] = useState<LiveKitStreamer | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Fetch user data for activity events
  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user) return;
      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.username) setUserName(data.user.username);
          if (data.user?.avatar) setUserAvatar(data.user.avatar);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, [session]);

  useEffect(() => {
    setIsLive(creator.isLive);
  }, [creator.isLive, setIsLive]);

  // Handle incoming chat messages from other viewers via LiveKit
  const handleReceiveMessage = useCallback((message: ChatMessage) => {
    // Check if we already have this message (by id) to avoid duplicates
    addMessage({
      user: message.user,
      message: message.message,
      avatar: message.avatar,
      tip: message.tip,
      isCreator: message.isCreator,
    });
  }, [addMessage]);

  // Called when StreamPlayer connects to LiveKit room
  const handleStreamerReady = useCallback((s: LiveKitStreamer) => {
    console.log('LiveKit streamer ready for chat');
    setStreamer(s);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const handleLike = async () => {
    if (!hasLiked) {
      setLikes(prev => prev + 1);
      setHasLiked(true);

      // Use actual user name and avatar
      const displayName = userName || session?.user?.name || 'You';
      const avatar = userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;
      const wireAvatar = userAvatar?.startsWith('data:')
        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`
        : avatar;

      // Add locally for immediate feedback
      addMessage({
        user: displayName,
        message: '❤️ Liked the stream!',
        avatar,
      });

      if (streamer) {
        // Send as chat message so all viewers see it
        await streamer.sendChatMessage({
          id: `like-${Date.now()}`,
          user: displayName,
          message: '❤️ Liked the stream!',
          avatar: wireAvatar,
          timestamp: Date.now(),
        });

        // Also send activity event to broadcaster's activity feed
        await streamer.sendActivityEvent({
          id: `like-${Date.now()}`,
          type: 'like',
          user: displayName,
          avatar: wireAvatar,
          timestamp: Date.now(),
        });
      }
    }
  };

  const handleFollow = async () => {
    if (isFollowing) {
      // Unfollow silently - no notification
      setIsFollowing(false);
      return;
    }

    // Follow - notify chat and broadcaster
    setIsFollowing(true);

    // Use actual user name and avatar
    const displayName = userName || session?.user?.name || 'Someone';
    const avatar = userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;
    const wireAvatar = userAvatar?.startsWith('data:')
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`
      : avatar;

    // Add locally for immediate feedback
    addMessage({
      user: displayName,
      message: '🎉 Started following!',
      avatar,
    });

    if (streamer) {
      // Send as chat message so all viewers see it
      await streamer.sendChatMessage({
        id: `follow-${Date.now()}`,
        user: displayName,
        message: '🎉 Started following!',
        avatar: wireAvatar,
        timestamp: Date.now(),
      });

      // Also send activity event to broadcaster's activity feed
      await streamer.sendActivityEvent({
        id: `follow-${Date.now()}`,
        type: 'follow',
        user: displayName,
        avatar: wireAvatar,
        timestamp: Date.now(),
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator.name} is LIVE!`,
          text: `Watch ${creator.name} live streaming on OSHO`,
          url: window.location.href,
        });
      } catch (error) {
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const isPositive = creator.priceChange24h > 0;

  return (
    <div className="min-h-screen lg:h-[calc(100vh-64px)] bg-[#0e0e10] overflow-hidden lg:relative fixed top-16 left-0 right-0 bottom-0 lg:static">
      {/* Main Layout - Responsive: stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row h-full overflow-hidden">
        {/* Video & Stream Info - Shows first on mobile */}
        <div className="flex-shrink-0 lg:flex-1 order-1 lg:order-2 flex flex-col">
          {/* Video Player - Aspect ratio on mobile, fill height on desktop */}
          <div className="bg-black w-full aspect-video lg:aspect-auto lg:flex-1">
            <StreamPlayer
              creator={creator}
              isLive={isLive}
              viewers={viewers || creator.viewers || 0}
              className="w-full h-full"
              onStreamerReady={handleStreamerReady}
            />
          </div>

          {/* Stream Info Below Video - Shows on both mobile and desktop */}
          <div className="bg-[#18181b] p-3 lg:p-4 flex-shrink-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={creator.avatar} alt={creator.name} />
                  <AvatarFallback className="bg-purple-600">
                    {creator.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-white font-bold text-lg">{creator.name}</h2>
                  <span className="flex items-center text-sm text-gray-400">
                    <Star className="h-4 w-4 mr-1 text-yellow-400" />
                    {formatNumber(likes)} likes
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleLike}
                  disabled={hasLiked}
                  size="icon"
                  className={`w-10 h-10 ${hasLiked
                    ? "bg-gray-600 text-white"
                    : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"}`}
                >
                  <Heart className={`h-5 w-5 ${hasLiked ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  onClick={handleFollow}
                  size="icon"
                  className={`w-10 h-10 ${isFollowing
                    ? "bg-gray-600 hover:bg-gray-700 text-white"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"}`}
                >
                  {isFollowing ? (
                    <UserCheck className="h-5 w-5" />
                  ) : (
                    <UserPlus className="h-5 w-5" />
                  )}
                </Button>
                <TipButton
                  creator={creator}
                  onTip={sendTip}
                  userName={userName || session?.user?.name || undefined}
                  userAvatar={userAvatar || undefined}
                  streamer={streamer}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Chat - Shows below video on mobile, left side on desktop */}
        <div className="w-full lg:w-[340px] bg-[#18181b] lg:border-r border-t lg:border-t-0 border-gray-800 flex flex-col flex-1 lg:flex-none lg:h-full order-2 lg:order-1 min-h-0">
          {/* Chat Header */}
          <div className="px-4 py-2 bg-[#18181b] border-b border-gray-800">
            <h3 className="text-gray-400 font-medium text-xs uppercase tracking-wide">Live Chat</h3>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-hidden">
            <LiveChat
              messages={messages || []}
              onSendMessage={addMessage}
              creatorSymbol={creator.symbol}
              streamer={streamer}
              onReceiveMessage={handleReceiveMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
