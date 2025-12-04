'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LiveKitStreamer } from '@/lib/livekit-stream';
import { Eye } from 'lucide-react';

interface UserStream {
  id: string;
  roomName: string;
  title: string;
  isLive: boolean;
  viewerCount: number;
  startedAt: string | null;
  thumbnail?: string | null;
  user: {
    id: string;
    username: string | null;
    avatar: string | null;
    walletAddress: string | null;
  };
}

interface UserStreamCardProps {
  stream: UserStream;
}

export function UserStreamCard({ stream }: UserStreamCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamerRef = useRef<LiveKitStreamer | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(stream.thumbnail || null);

  const username = stream.user.username || 'Anonymous';
  const initials = username.slice(0, 2).toUpperCase();

  // Update thumbnail when stream data changes or poll for updates
  useEffect(() => {
    if (!stream.isLive) {
      setThumbnail(null);
      return;
    }

    // Use thumbnail from stream data
    if (stream.thumbnail) {
      setThumbnail(stream.thumbnail);
    }

    // Also poll for updates every 15 seconds
    const fetchThumbnail = async () => {
      try {
        const response = await fetch(`/api/stream/thumbnail?symbol=${stream.roomName}`);
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnail) {
            setThumbnail(data.thumbnail);
          }
        }
      } catch (error) {
        // Silently fail - thumbnail is optional
      }
    };

    const interval = setInterval(fetchThumbnail, 15000);
    return () => clearInterval(interval);
  }, [stream.isLive, stream.roomName, stream.thumbnail]);

  useEffect(() => {
    // Only connect when hovering
    if (!stream.isLive || !videoRef.current || !isHovering) {
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
      streamerRef.current = new LiveKitStreamer(stream.roomName);

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
  }, [stream.isLive, stream.roomName, isHovering]);

  return (
    <Link href={`/live/${stream.roomName}`}>
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
                  alt={`${username}'s stream`}
                  className="w-full h-full object-cover"
                />
              ) : (
                // Fallback to avatar if no thumbnail
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/80 to-pink-900/80">
                  <Avatar className="h-20 w-20 ring-4 ring-white/20">
                    <AvatarImage src={stream.user.avatar || undefined} alt={username} />
                    <AvatarFallback className="bg-purple-600 text-2xl">
                      {initials}
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
              {stream.viewerCount || 0}
            </Badge>
          </div>

        </div>

        {/* Creator info */}
        <div className="p-3">
          <div className="flex items-start space-x-3">
            <Avatar className="h-9 w-9 ring-2 ring-purple-500">
              <AvatarImage src={stream.user.avatar || undefined} alt={username} />
              <AvatarFallback className="bg-purple-600 text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm truncate">
                {username}
              </h3>
              <p className="text-gray-400 text-xs truncate">
                {stream.title}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
