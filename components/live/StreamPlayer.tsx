'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Creator } from '@/lib/types';
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
}

export function StreamPlayer({ creator, isLive, viewers, className = '' }: StreamPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'buffering' | 'disconnected'>('connected');
  const [streamQuality, setStreamQuality] = useState('1080p');

  // Simulate connection status changes
  useEffect(() => {
    if (!isLive) {
      setConnectionStatus('disconnected');
      return;
    }

    const interval = setInterval(() => {
      if (Math.random() < 0.1) {
        setConnectionStatus('buffering');
        setTimeout(() => setConnectionStatus('connected'), 1000);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isLive]);

  // Format viewer count for display
  const formatViewers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // In a real app, this would use the Fullscreen API
  };

  const qualityOptions = ['1080p', '720p', '480p', '360p'];

  return (
    <Card className={`${className} bg-black border-gray-700 overflow-hidden`}>
      <CardContent className="p-0 relative">
        {/* Video Player Area */}
        <div className="aspect-video bg-black relative group">
          {/* Stream Status Overlay */}
          <div className="absolute top-4 left-4 z-20 flex items-center space-x-3">
            <Badge 
              variant={isLive ? "destructive" : "secondary"}
              className={isLive ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-gray-600"}
            >
              <Radio className="h-3 w-3 mr-1" />
              {isLive ? 'LIVE' : 'OFFLINE'}
            </Badge>
            
            {isLive && (
              <Badge variant="outline" className="bg-black/50 border-white/20 text-white">
                <Eye className="h-3 w-3 mr-1" />
                {formatViewers(viewers)}
              </Badge>
            )}
            
            <Badge 
              variant="outline" 
              className={`bg-black/50 border-white/20 ${
                connectionStatus === 'connected' ? 'text-green-400' :
                connectionStatus === 'buffering' ? 'text-yellow-400' :
                'text-red-400'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {connectionStatus}
            </Badge>
          </div>

          {/* Stream Content */}
          {isLive ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
              {/* Placeholder for actual stream */}
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center animate-pulse">
                  <Radio className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{creator.name} is LIVE!</h3>
                  <p className="text-gray-300">{creator.description}</p>
                </div>
                <div className="flex items-center justify-center space-x-4 text-white/80">
                  <span className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{formatViewers(viewers)} watching</span>
                  </span>
                  <span>•</span>
                  <span>{streamQuality}</span>
                  <span>•</span>
                  <span className={`flex items-center space-x-1 ${
                    connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
                    } animate-pulse`} />
                    <span>{connectionStatus}</span>
                  </span>
                </div>
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

        {/* Stream Info Bar */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-white font-semibold">
                {isLive ? 'Broadcasting live' : 'Stream offline'}
              </span>
              {isLive && (
                <span className="text-gray-400 text-sm">
                  • Started 2 hours ago
                </span>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-white font-semibold">${creator.symbol}</p>
              <p className="text-gray-400 text-sm">${creator.price.toFixed(6)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}