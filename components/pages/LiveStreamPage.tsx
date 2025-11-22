'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StreamPlayer } from '@/components/live/StreamPlayer';
import { LiveChat } from '@/components/live/LiveChat';
import { TipButton } from '@/components/live/TipButton';
import { Creator } from '@/lib/types';
import { useLiveStream } from '@/hooks/useLiveStream';
import { 
  Eye,
  Users, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Share2,
  Heart,
  MessageCircle,
  Radio
} from 'lucide-react';

interface LiveStreamPageProps {
  creator: Creator;
}

export function LiveStreamPage({ creator }: LiveStreamPageProps) {
  const { messages, viewers, isLive, setIsLive, addMessage, sendTip } = useLiveStream(creator.symbol);
  const [likes, setLikes] = useState(1247);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    // Set initial live state
    setIsLive(creator.isLive);
    
    // Simulate viewer count updates
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        // Random viewer count changes
        const change = Math.floor(Math.random() * 20 - 10);
        // Update would happen through state management in real app
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [creator.isLive, setIsLive]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const handleLike = () => {
    if (!hasLiked) {
      setLikes(prev => prev + 1);
      setHasLiked(true);
      addMessage({
        user: 'You',
        message: '❤️ Liked the stream!',
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator.name} is LIVE!`,
          text: `Watch ${creator.name} live streaming on creator.fun`,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        alert('Stream link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Stream link copied to clipboard!');
    }
  };

  const isPositive = creator.priceChange24h > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Stream Area - 3/4 width */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stream Player */}
          <StreamPlayer 
            creator={creator}
            isLive={isLive}
            viewers={viewers || creator.viewers || 0}
          />

          {/* Stream Info */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12 ring-2 ring-red-500/50">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600">
                      {creator.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <h1 className="text-xl font-bold text-white">{creator.name}</h1>
                      <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 animate-pulse">
                        <Radio className="h-3 w-3 mr-1" />
                        LIVE
                      </Badge>
                    </div>
                    <p className="text-purple-400 font-mono">${creator.symbol}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLike}
                    disabled={hasLiked}
                    className={`border-gray-600 ${hasLiked ? 'text-red-400 border-red-500' : 'text-gray-300 hover:text-white'}`}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${hasLiked ? 'fill-current' : ''}`} />
                    {formatNumber(likes)}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="border-gray-600 text-gray-300 hover:text-white"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>

                  <Link href={`/token/${creator.symbol}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-purple-500 text-purple-300 hover:bg-purple-500/10"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Token Page
                    </Button>
                  </Link>
                </div>
              </div>

              <p className="text-gray-300 mb-4">{creator.description}</p>

              {/* Stream Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-800/50 rounded">
                  <Eye className="h-5 w-5 mx-auto mb-1 text-red-400" />
                  <p className="text-white font-semibold">{formatNumber(viewers || creator.viewers || 0)}</p>
                  <p className="text-gray-400 text-sm">Watching</p>
                </div>
                
                <div className="text-center p-3 bg-gray-800/50 rounded">
                  <Users className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                  <p className="text-white font-semibold">{formatNumber(creator.holders)}</p>
                  <p className="text-gray-400 text-sm">Holders</p>
                </div>
                
                <div className="text-center p-3 bg-gray-800/50 rounded">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-400" />
                  <p className="text-white font-semibold">${creator.price.toFixed(6)}</p>
                  <p className="text-gray-400 text-sm">Price</p>
                </div>
                
                <div className="text-center p-3 bg-gray-800/50 rounded">
                  {isPositive ? (
                    <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 mx-auto mb-1 text-red-400" />
                  )}
                  <p className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{creator.priceChange24h.toFixed(1)}%
                  </p>
                  <p className="text-gray-400 text-sm">24h Change</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Sidebar - 1/4 width */}
        <div className="space-y-4">
          {/* Live Chat */}
          <Card className="bg-gray-900 border-gray-700 h-96 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-blue-400" />
                <span>Live Chat</span>
                <Badge variant="outline" className="text-xs">
                  {formatNumber((messages?.length || 0) + 127)} messages
                </Badge>
              </CardTitle>
            </CardHeader>
            <div className="flex-1 min-h-0">
              <LiveChat
                messages={messages || creator.messages || []}
                onSendMessage={addMessage}
                creatorSymbol={creator.symbol}
              />
            </div>
          </Card>

          {/* Tip Creator */}
          <TipButton
            creator={creator}
            onTip={sendTip}
            className="w-full"
          />

          {/* Quick Buy CTA */}
          <Card className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-green-500/50">
            <CardContent className="p-4 text-center space-y-3">
              <h3 className="text-white font-semibold">Buy ${creator.symbol}</h3>
              <p className="text-gray-300 text-sm">
                Support {creator.name} by buying their token!
              </p>
              <Link href={`/token/${creator.symbol}`}>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Buy Now
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Live Viewers (if space allows) */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center space-x-2">
                <Eye className="h-4 w-4 text-red-400" />
                <span>Live Viewers</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {/* Mock viewer avatars */}
                <div className="flex -space-x-2">
                  {[...Array(8)].map((_, i) => (
                    <Avatar key={i} className="h-6 w-6 border-2 border-gray-800">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} />
                      <AvatarFallback className="text-xs">U</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <p className="text-gray-400 text-xs">
                  and {formatNumber((viewers || creator.viewers || 0) - 8)} others
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}