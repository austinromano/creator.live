'use client';
import React, { useState, useEffect, useCallback } from 'react';
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

interface GuestPipInfo {
  guestRoomName: string;
  guestUsername: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface StreamPlayerProps {
  creator: Creator;
  isLive: boolean;
  viewers: number;
  className?: string;
  onStreamerReady?: (streamer: LiveKitStreamer) => void;
}

export function StreamPlayer({ creator, isLive, viewers, className = '', onStreamerReady }: StreamPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const guestVideoRef = React.useRef<HTMLVideoElement>(null);
  const streamerRef = React.useRef<LiveKitStreamer | null>(null);
  const guestStreamerRef = React.useRef<LiveKitStreamer | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted by default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'buffering' | 'disconnected'>('disconnected');
  const [streamQuality, setStreamQuality] = useState('1080p');
  const [hasStream, setHasStream] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Guest PiP state
  const [guestPip, setGuestPip] = useState<GuestPipInfo | null>(null);
  const [guestConnected, setGuestConnected] = useState(false);

  // Detect iOS
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
    console.log('iOS detected:', iOS);
  }, []);

  // Track current guest room to avoid reconnecting
  const currentGuestRoomRef = React.useRef<string | null>(null);

  // Handle guest PiP data messages
  const handleGuestPipMessage = useCallback(async (data: any) => {
    console.log('🎬 Guest PiP message received:', data);

    if (data.action === 'start') {
      // Check if we're already connected to this guest - just update position/size
      if (currentGuestRoomRef.current === data.guestRoomName && guestStreamerRef.current) {
        console.log('🎬 Already connected to guest, updating position only');
        // Make sure guestConnected is true (in case it wasn't set)
        setGuestConnected(true);
        setGuestPip(prev => prev ? {
          ...prev,
          position: data.position,
          size: data.size,
        } : {
          guestRoomName: data.guestRoomName,
          guestUsername: data.guestUsername,
          position: data.position,
          size: data.size,
        });
        return;
      }

      console.log('🎬 Starting guest PiP overlay for:', data.guestUsername);
      currentGuestRoomRef.current = data.guestRoomName;

      // Start showing guest PiP - connect to guest's stream
      setGuestPip({
        guestRoomName: data.guestRoomName,
        guestUsername: data.guestUsername,
        position: data.position,
        size: data.size,
      });

      // Connect to guest's LiveKit stream
      if (guestStreamerRef.current) {
        guestStreamerRef.current.close();
      }

      guestStreamerRef.current = new LiveKitStreamer(data.guestRoomName);

      // Wait for video element to be rendered
      setTimeout(async () => {
        if (guestVideoRef.current && guestStreamerRef.current) {
          try {
            await guestStreamerRef.current.startViewingWithElement(
              guestVideoRef.current,
              () => {
                console.log('Guest PiP stream connected');
                setGuestConnected(true);
              },
              undefined,
              { muteAudio: false } // Play guest audio
            );
          } catch (error) {
            console.error('Failed to connect to guest stream:', error);
          }
        }
      }, 100);

    } else if (data.action === 'update') {
      // Update guest position/size
      setGuestPip(prev => prev ? {
        ...prev,
        position: data.position,
        size: data.size,
      } : null);

    } else if (data.action === 'stop') {
      // Stop showing guest PiP
      currentGuestRoomRef.current = null;
      if (guestStreamerRef.current) {
        guestStreamerRef.current.close();
        guestStreamerRef.current = null;
      }
      setGuestPip(null);
      setGuestConnected(false);
    }
  }, []);

  // Cleanup guest stream on unmount
  useEffect(() => {
    return () => {
      if (guestStreamerRef.current) {
        guestStreamerRef.current.close();
        guestStreamerRef.current = null;
      }
    };
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

      // Register guest PiP callback BEFORE connecting so we don't miss any messages
      console.log('🎬 Pre-registering guest PiP callback');
      streamerRef.current.onGuestPip(handleGuestPipMessage);

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
  }, [isLive, creator.symbol, handleGuestPipMessage]);

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
      {/* Video Player Area - Fixed 16:9 aspect ratio container */}
      <div className="w-full h-full bg-black relative flex items-center justify-center">
          {/* Stream Content */}
          {isLive ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* 16:9 aspect ratio wrapper - this maintains consistent proportions */}
              <div className="relative w-full" style={{ maxHeight: '100%', aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  autoPlay
                  muted={isMuted}
                  playsInline
                  webkit-playsinline="true"
                  x-webkit-airplay="allow"
                  controls={false}
                />

                {/* Guest PiP Overlay - positioned relative to 16:9 container */}
                {guestPip && (
                  <div
                    className="absolute transition-all duration-300 ease-out"
                    style={{
                      // Convert from broadcast canvas coordinates (1920x1080) to percentage
                      left: `${(guestPip.position.x / 1920) * 100}%`,
                      top: `${(guestPip.position.y / 1080) * 100}%`,
                      width: `${(guestPip.size.width / 1920) * 100}%`,
                      height: `${(guestPip.size.height / 1080) * 100}%`,
                    }}
                  >
                    {/* Green border */}
                    <div className="absolute inset-0 rounded-lg border-4 border-green-500 -m-1" />

                    {/* Guest video */}
                    <video
                      ref={guestVideoRef}
                      className="w-full h-full object-cover rounded-lg bg-black"
                      autoPlay
                      playsInline
                      muted={false}
                      onPlaying={() => setGuestConnected(true)}
                    />

                    {/* Guest username label */}
                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-sm">
                      {guestPip.guestUsername}
                    </div>

                    {/* Loading state */}
                    {!guestConnected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                )}
                {/* Loading overlay - inside aspect ratio container */}
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