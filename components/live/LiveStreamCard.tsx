'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Creator } from '@/lib/types';
import { LiveKitStreamer } from '@/lib/livekit-stream';
import { Eye, Users } from 'lucide-react';

interface LiveStreamCardProps {
  creator: Creator;
}

export function LiveStreamCard({ creator }: LiveStreamCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamerRef = useRef<LiveKitStreamer | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // Fetch thumbnail for the stream
  useEffect(() => {
    if (!creator.isLive) {
      setThumbnail(null);
      return;
    }

    const fetchThumbnail = async () => {
      try {
        const response = await fetch(`/api/stream/thumbnail?symbol=${creator.symbol}`);
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnail) {
            setThumbnail(data.thumbnail);
          }
        }
      } catch (error) {
        console.error('Failed to fetch thumbnail:', error);
      }
    };

    // Fetch immediately
    fetchThumbnail();

    // Refresh thumbnail every 15 seconds
    const interval = setInterval(fetchThumbnail, 15000);

    return () => clearInterval(interval);
  }, [creator.isLive, creator.symbol]);

  useEffect(() => {
    // Only connect when hovering
    if (!creator.isLive || !videoRef.current || !isHovering) {
      // Disconnect if not hovering
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Connect to LiveKit stream for preview on hover
    const connectToStream = async () => {
      streamerRef.current = new LiveKitStreamer(creator.symbol);

      try {
        await streamerRef.current.startViewingWithElement(
          videoRef.current!,
          () => {
            setIsConnected(true);
          }
        );
      } catch (error) {
        console.error('Failed to connect to stream preview:', error);
      }
    };

    connectToStream();

    return () => {
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
      }
    };
  }, [creator.isLive, creator.symbol, isHovering]);

  return (
    <Link href={`/live/${creator.symbol}`}>
      <div
        className="group relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Video Preview */}
        <div className="relative aspect-[4/3] bg-black">
          {/* Static thumbnail (shown when not hovering) */}
          {!isHovering && (
            <div className="absolute inset-0">
              {thumbnail ? (
                // Show actual stream thumbnail
                <img
                  src={thumbnail}
                  alt={`${creator.name}'s stream`}
                  className="w-full h-full object-cover"
                />
              ) : (
                // Fallback to avatar if no thumbnail
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/80 to-pink-900/80">
                  <Avatar className="h-20 w-20 ring-4 ring-white/20">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback className="bg-purple-600 text-2xl">
                      {creator.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          )}

          {/* Video element (connects on hover) */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isHovering ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            muted
            playsInline
          />

          {/* Loading state when hovering but not connected */}
          {isHovering && !isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Live badge */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 animate-pulse">
              LIVE
            </Badge>
          </div>

          {/* Viewer count */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/70 text-white text-xs">
              <Eye className="h-3 w-3 mr-1" />
              {creator.viewers || 0}
            </Badge>
          </div>

        </div>

        {/* Creator info */}
        <div className="p-3">
          <div className="flex items-start space-x-3">
            <Link
              href={`/profile/${creator.name}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0"
            >
              <Avatar className="h-9 w-9 ring-2 ring-purple-500 hover:ring-purple-400 transition-all cursor-pointer">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="bg-purple-600 text-xs">
                  {creator.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <Link
                href={`/profile/${creator.name}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline"
              >
                <h3 className="text-white font-semibold text-sm truncate">
                  {creator.name}
                </h3>
              </Link>
              <p className="text-gray-400 text-xs truncate">
                ${creator.symbol}
              </p>
              <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                <span className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {creator.holders} holders
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
