'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LiveKitStreamer } from '@/lib/livekit-stream';
import { Eye } from 'lucide-react';
import { isAudioUnlocked } from '@/lib/audio-unlock';

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
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamerRef = useRef<LiveKitStreamer | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const username = stream.user.username || 'Anonymous';
  const initials = username.slice(0, 2).toUpperCase();

  // Use Intersection Observer to detect when card is visible
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // Auto-connect to live stream when visible
  useEffect(() => {
    if (!stream.isLive || !videoRef.current || !isVisible) {
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Prevent duplicate connections
    if (streamerRef.current) {
      return;
    }

    // Connect to LiveKit stream
    const connectToStream = async () => {
      streamerRef.current = new LiveKitStreamer(stream.roomName);

      try {
        await streamerRef.current.startViewingWithElement(
          videoRef.current!,
          () => {
            setIsConnected(true);
            // Force play again after connection to ensure it starts
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          },
          undefined,
          { muteAudio: true } // Don't attach audio on homepage previews
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
  }, [stream.isLive, stream.roomName, isVisible]);

  // Retry play when audio becomes unlocked (iOS Safari)
  useEffect(() => {
    if (!videoRef.current || isConnected) return;

    const checkAndPlay = () => {
      if (isAudioUnlocked() && videoRef.current && videoRef.current.srcObject) {
        videoRef.current.muted = true;
        videoRef.current.play()
          .then(() => setIsConnected(true))
          .catch(() => {});
      }
    };

    // Check periodically until audio is unlocked and video plays
    const interval = setInterval(checkAndPlay, 500);
    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <Link href={`/live/${stream.roomName}`}>
      <div
        ref={cardRef}
        className="group relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
      >
        {/* Video Preview */}
        <div className="relative aspect-[4/3] bg-black">
          {/* Fallback shown while connecting */}
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/80 to-pink-900/80">
              <Avatar className="h-20 w-20 ring-4 ring-white/20">
                <AvatarImage src={stream.user.avatar || undefined} alt={username} />
                <AvatarFallback className="bg-purple-600 text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Live video element - always visible */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isConnected ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            muted
            playsInline
            webkit-playsinline="true"
          />


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
