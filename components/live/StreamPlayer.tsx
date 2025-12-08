'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Creator } from '@/lib/types';
import { LiveKitStreamer } from '@/lib/livekit-stream';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Radio,
  Eye,
  Wifi,
  WifiOff
} from 'lucide-react';

interface StreamPlayerProps {
  creator: Creator;
  isLive: boolean;
  viewers: number;
  className?: string;
  onStreamerReady?: (streamer: LiveKitStreamer) => void;
}

export function StreamPlayer({ creator, isLive, viewers, className = '', onStreamerReady }: StreamPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamerRef = React.useRef<LiveKitStreamer | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted by default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'buffering' | 'disconnected'>('disconnected');
  const [streamQuality, setStreamQuality] = useState('1080p');
  const [hasStream, setHasStream] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Detect iOS
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
    console.log('iOS detected:', iOS);
  }, []);

  // Connect to LiveKit stream when live
  useEffect(() => {
    if (!isLive) {
      setConnectionStatus('disconnected');
      setHasStream(false);
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
      }
      return;
    }

    // Try to connect to LiveKit stream
    console.log('Attempting to connect to LiveKit stream for:', creator.symbol);
    setConnectionStatus('buffering');

    const connectToStream = async () => {
      if (streamerRef.current) {
        streamerRef.current.close();
      }

      streamerRef.current = new LiveKitStreamer(creator.symbol);

      try {
        if (videoRef.current) {
          // Use the new method that uses LiveKit's native track.attach()
          await streamerRef.current.startViewingWithElement(
            videoRef.current,
            () => {
              // Called when video starts playing
              console.log('LiveKit stream connected and playing');
              setHasStream(true);
              setConnectionStatus('connected');
              setIsMuted(true);
              setNeedsUserInteraction(false);
              // Notify parent that streamer is ready for chat
              if (onStreamerReady && streamerRef.current) {
                onStreamerReady(streamerRef.current);
              }
            },
            () => {
              // Called when autoplay fails and needs user interaction (iOS Safari)
              console.log('Autoplay blocked, needs user interaction');
              setHasStream(true);
              setConnectionStatus('connected');
              setNeedsUserInteraction(true);
              // Still notify parent that streamer is ready for chat
              if (onStreamerReady && streamerRef.current) {
                onStreamerReady(streamerRef.current);
              }
            }
          );
        }
      } catch (error) {
        console.error('Failed to connect to LiveKit:', error);
        setConnectionStatus('disconnected');
      }
    };

    connectToStream();

    return () => {
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
      }
    };
  }, [isLive, creator.symbol]);

  // Format viewer count for display
  const formatViewers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = async () => {
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
      setIsFullscreen(!isFullscreen);
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const qualityOptions = ['1080p', '720p', '480p', '360p'];

  return (
    <div className={`${className} bg-black overflow-hidden relative group`}>
      {/* Video Player Area */}
      <div className="w-full h-full bg-black relative">
          {/* Stream Content */}
          {isLive ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                autoPlay
                muted={isMuted}
                playsInline
                webkit-playsinline="true"
                x-webkit-airplay="allow"
                controls={false}
              />
              {!hasStream && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    <p className="text-white text-lg">Connecting to live stream...</p>
                    <p className="text-gray-400 text-sm">Waiting for broadcaster</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gray-700 rounded-full flex items-center justify-center">
                  <Radio className="h-8 w-8 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{creator.name} is offline</h3>
                  <p className="text-gray-400">This creator is not currently streaming</p>
                </div>
              </div>
            </div>
          )}

          {/* Player Controls */}
          {isLive && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePlayPause}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>

                  <div className="text-white text-sm">
                    {isPlaying ? 'Live' : 'Paused'}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select 
                    value={streamQuality}
                    onChange={(e) => setStreamQuality(e.target.value)}
                    className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-white/20"
                  >
                    {qualityOptions.map(quality => (
                      <option key={quality} value={quality}>{quality}</option>
                    ))}
                  </select>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    <Maximize className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Buffering Indicator */}
          {connectionStatus === 'buffering' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                <p className="text-white text-sm">Buffering...</p>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}