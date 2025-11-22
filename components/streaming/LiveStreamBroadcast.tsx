'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff,
  Users,
  Eye,
  Radio,
  Square
} from 'lucide-react';

interface LiveStreamBroadcastProps {
  tokenSymbol: string;
  onStreamStart: () => void;
  onStreamStop: () => void;
  isStreaming: boolean;
  viewerCount: number;
}

export function LiveStreamBroadcast({ 
  tokenSymbol, 
  onStreamStart, 
  onStreamStop, 
  isStreaming,
  viewerCount = 0
}: LiveStreamBroadcastProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const checkDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setHasCamera(devices.some(device => device.kind === 'videoinput'));
      setHasMicrophone(devices.some(device => device.kind === 'audioinput'));
    } catch (error) {
      console.error('Error checking devices:', error);
    }
  };

  const startCamera = async () => {
    try {
      setIsInitializing(true);
      
      const constraints: MediaStreamConstraints = {
        video: cameraEnabled && hasCamera,
        audio: microphoneEnabled && hasMicrophone
      };

      if (screenShare) {
        // Get screen share stream
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        streamRef.current = screenStream;
      } else {
        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
      }

      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.muted = true; // Prevent echo
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera/microphone. Please check permissions.');
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = async () => {
    setCameraEnabled(!cameraEnabled);
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraEnabled;
      }
    }
  };

  const toggleMicrophone = async () => {
    setMicrophoneEnabled(!microphoneEnabled);
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !microphoneEnabled;
      }
    }
  };

  const toggleScreenShare = async () => {
    setScreenShare(!screenShare);
    if (isStreaming) {
      stopCamera();
      await startCamera();
    }
  };

  const handleStartStream = async () => {
    await startCamera();
    onStreamStart();
  };

  const handleStopStream = () => {
    stopCamera();
    onStreamStop();
  };

  useEffect(() => {
    checkDevices();
  }, []);

  useEffect(() => {
    if (isStreaming && !streamRef.current) {
      startCamera();
    }
  }, [isStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <Radio className={`h-5 w-5 ${isStreaming ? 'text-red-500' : 'text-gray-400'}`} />
            <span>Live Stream for {tokenSymbol}</span>
          </CardTitle>
          {isStreaming && (
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
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {!isStreaming && !streamRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center text-gray-400">
                <Video className="h-12 w-12 mx-auto mb-2" />
                <p>Camera preview will appear here</p>
              </div>
            </div>
          )}
          
          {isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Initializing camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleCamera}
            disabled={!hasCamera || isInitializing}
            className={`${cameraEnabled ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}`}
          >
            {cameraEnabled ? <Video className="h-4 w-4 mr-1" /> : <VideoOff className="h-4 w-4 mr-1" />}
            {cameraEnabled ? 'Camera On' : 'Camera Off'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleMicrophone}
            disabled={!hasMicrophone || isInitializing}
            className={`${microphoneEnabled ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}`}
          >
            {microphoneEnabled ? <Mic className="h-4 w-4 mr-1" /> : <MicOff className="h-4 w-4 mr-1" />}
            {microphoneEnabled ? 'Mic On' : 'Mic Off'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleScreenShare}
            disabled={isInitializing}
            className={`${screenShare ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-gray-400'}`}
          >
            {screenShare ? <Monitor className="h-4 w-4 mr-1" /> : <MonitorOff className="h-4 w-4 mr-1" />}
            {screenShare ? 'Screen On' : 'Screen Share'}
          </Button>
        </div>

        {/* Stream Controls */}
        <div className="flex gap-3">
          {!isStreaming ? (
            <Button
              onClick={handleStartStream}
              disabled={isInitializing || (!hasCamera && !hasMicrophone)}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Radio className="h-4 w-4 mr-2" />
              Go Live
            </Button>
          ) : (
            <Button
              onClick={handleStopStream}
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Stream
            </Button>
          )}
        </div>

        {/* Device Status */}
        <div className="text-sm text-gray-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Camera Available:</span>
            <span className={hasCamera ? 'text-green-400' : 'text-red-400'}>
              {hasCamera ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Microphone Available:</span>
            <span className={hasMicrophone ? 'text-green-400' : 'text-red-400'}>
              {hasMicrophone ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        {!hasCamera && !hasMicrophone && (
          <div className="p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg text-yellow-300 text-sm">
            No camera or microphone detected. Please ensure you have media devices available and grant permissions when prompted.
          </div>
        )}
      </CardContent>
    </Card>
  );
}