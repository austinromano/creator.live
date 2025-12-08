'use client';
import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Eye,
  VolumeX,
  Volume2,
  Maximize,
  Users,
  Radio
} from 'lucide-react';
import { Creator } from '@/lib/types';

interface LiveStreamViewerProps {
  creator: Creator;
  viewerCount?: number;
  streamUrl?: string; // For future integration with streaming service
}

export function LiveStreamViewer({ 
  creator, 
  viewerCount = 0,
  streamUrl 
}: LiveStreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = async () => {
    if (!videoRef.current) return;

    try {
      if (!isFullscreen) {
        if (videoRef.current.requestFullscreen) {
          await videoRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    setStreamError(null);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setStreamError('Failed to load stream');
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Simulate stream connection for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (!streamUrl) {
        // For demo purposes, we'll show a placeholder
        setStreamError('Stream will connect here in production');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [streamUrl]);

  return (
    <Card className="bg-gray-900 border-gray-700 overflow-hidden">
      <CardContent className="p-0">
        {/* Stream Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <Link
            href={`/profile/${creator.name}`}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-10 h-10 rounded-full ring-2 ring-purple-500/50 cursor-pointer"
            />
            <div>
              <h3 className="text-white font-semibold">{creator.name}</h3>
              <p className="text-gray-400 text-sm">{creator.symbol}</p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-2">
            <Badge variant="destructive" className="bg-red-600">
              <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
              LIVE
            </Badge>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>{viewerCount}</span>
            </Badge>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video bg-black">
          {streamUrl ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              onLoadedData={handleVideoLoad}
              onError={handleVideoError}
              src={streamUrl}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
              <div className="text-center text-white">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-lg">Connecting to stream...</p>
                    <p className="text-sm text-gray-400 mt-2">Please wait while we establish connection</p>
                  </>
                ) : streamError ? (
                  <>
                    <Radio className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg text-gray-400">Stream Preview Mode</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Live streaming will be available when integrated with a streaming service
                    </p>
                  </>
                ) : (
                  <>
                    <Radio className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg">{creator.name} is live!</p>
                    <p className="text-sm text-gray-400 mt-2">Broadcasting {creator.symbol} content</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Video Controls Overlay */}
          {!isLoading && !streamError && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Stream Info */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{viewerCount} watching</span>
              </div>
              <div className="flex items-center space-x-1">
                <Radio className="h-4 w-4" />
                <span>Live for {Math.floor(Math.random() * 30) + 1}m</span>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-white font-semibold">${creator.symbol}</p>
              <p className="text-xs">Market Cap: ${(creator.marketCap / 1000).toFixed(1)}K</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}