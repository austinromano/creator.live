'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { X, Settings, FlipHorizontal, Zap, Camera as CameraIcon, Loader2, Radio, Gamepad2, Music, Send, Eye, Video, Circle, Square } from 'lucide-react';
import Link from 'next/link';
import { LiveKitStreamer, LiveKitChatMessage, LiveKitActivityEvent } from '@/lib/livekit-stream';

type CameraMode = 'POST' | 'VIDEO' | 'LIVE';

export default function CameraPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<CameraMode>('POST');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live streaming state
  const [isLive, setIsLive] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [roomName, setRoomName] = useState<string>('');
  const [streamId, setStreamId] = useState<string>('');
  const [messages, setMessages] = useState<LiveKitChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  const livekitStreamerRef = useRef<LiveKitStreamer | null>(null);

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isTransitioning || capturedImage || recordedVideoUrl) return;
    touchStartX.current = e.touches[0].clientX;
    setSwipeOffset(0);
  }, [isTransitioning, capturedImage, recordedVideoUrl]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartX.current || isTransitioning || capturedImage || recordedVideoUrl) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    // Limit swipe based on current mode
    if (mode === 'POST' && diff > 0) return; // Can't swipe right on POST
    if (mode === 'LIVE' && diff < 0) return; // Can't swipe left on LIVE
    setSwipeOffset(diff * 0.3);
  }, [isTransitioning, mode, capturedImage, recordedVideoUrl]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || isTransitioning || capturedImage || recordedVideoUrl) return;

    const minSwipeDistance = 50;

    if (Math.abs(swipeOffset) > minSwipeDistance * 0.3) {
      if (swipeOffset < 0) {
        // Swipe left
        setIsTransitioning(true);
        setSwipeOffset(-50);
        setTimeout(() => {
          if (mode === 'POST') {
            setMode('VIDEO');
          } else if (mode === 'VIDEO') {
            setMode('LIVE');
          }
          setSwipeOffset(0);
          setIsTransitioning(false);
        }, 150);
      } else if (swipeOffset > 0) {
        // Swipe right
        setIsTransitioning(true);
        setSwipeOffset(50);
        setTimeout(() => {
          if (mode === 'LIVE') {
            setMode('VIDEO');
          } else if (mode === 'VIDEO') {
            setMode('POST');
          }
          setSwipeOffset(0);
          setIsTransitioning(false);
        }, 150);
      } else {
        setSwipeOffset(0);
      }
    } else {
      setSwipeOffset(0);
    }

    touchStartX.current = null;
  }, [mode, swipeOffset, isTransitioning, capturedImage, recordedVideoUrl]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        // Don't restart camera if already live - LiveKit is using it
        if (isLive) return;

        // Stop any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error('Camera access denied:', err);
        setHasPermission(false);
      }
    };

    if (status === 'authenticated' && !capturedImage && !recordedVideoUrl) {
      startCamera();
    }

    return () => {
      // Don't stop camera if we're live - LiveKit needs it
      if (!isLive && streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [status, facingMode, capturedImage, isLive, recordedVideoUrl]);

  // Cleanup LiveKit connection on unmount
  useEffect(() => {
    return () => {
      if (livekitStreamerRef.current) {
        livekitStreamerRef.current.close();
        livekitStreamerRef.current = null;
      }
    };
  }, []);

  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Instagram portrait aspect ratio (4:5)
    const targetAspectRatio = 4 / 5;
    const videoAspectRatio = video.videoWidth / video.videoHeight;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;

    // Calculate crop dimensions to achieve 4:5 aspect ratio
    if (videoAspectRatio > targetAspectRatio) {
      // Video is wider than target, crop width
      sourceWidth = video.videoHeight * targetAspectRatio;
      sourceX = (video.videoWidth - sourceWidth) / 2;
    } else {
      // Video is taller than target, crop height
      sourceHeight = video.videoWidth / targetAspectRatio;
      sourceY = (video.videoHeight - sourceHeight) / 2;
    }

    // Set canvas to portrait dimensions (e.g., 1080x1350)
    const canvasWidth = 1080;
    const canvasHeight = 1350;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Flip horizontally if using front camera
    if (facingMode === 'user') {
      context.translate(canvasWidth, 0);
      context.scale(-1, 1);
    }

    // Draw the cropped video frame
    context.drawImage(
      video,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, canvasWidth, canvasHeight
    );

    // Get the image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);

    // Stop the camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCaption('');
  };

  const postPhoto = async () => {
    if (!capturedImage) return;

    setIsPosting(true);

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('file', blob, 'photo.jpg');
      formData.append('type', 'free');
      if (caption.trim()) {
        formData.append('title', caption.trim());
      }

      // Upload the post
      const uploadResponse = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        // Success - redirect to home feed
        router.push('/');
      } else {
        const data = await uploadResponse.json();
        alert(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error posting photo:', error);
      alert('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const startLive = async () => {
    if (!selectedCategory || !session?.user || !streamRef.current) return;

    setIsGoingLive(true);

    try {
      // Start stream in database
      const response = await fetch('/api/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          title: `${session.user.name}'s Live Stream`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start stream');
      }

      const data = await response.json();
      const newRoomName = data.roomName;
      const newStreamId = data.stream.id;
      setRoomName(newRoomName);
      setStreamId(newStreamId);

      // Initialize LiveKit streamer
      const streamer = new LiveKitStreamer(newRoomName);
      livekitStreamerRef.current = streamer;

      // Setup chat message handler
      streamer.onChatMessage((message) => {
        setMessages((prev) => [...prev, message]);
      });

      // Setup activity event handler
      streamer.onActivityEvent((event) => {
        console.log('Activity event:', event);
        // Handle likes, follows, tips, etc.
      });

      // Get camera stream with audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });

      // Update stream ref
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      streamRef.current = stream;

      // Keep video element showing the stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.play().catch(e => console.log('Video play error:', e));
      }

      // Start broadcasting (LiveKit will use the tracks without taking them away)
      await streamer.startBroadcast(stream);

      setIsLive(true);
      setIsGoingLive(false);

      console.log('Live stream started!');
    } catch (error) {
      console.error('Error starting live stream:', error);
      alert('Failed to start live stream');
      setIsGoingLive(false);
    }
  };

  const endLive = async () => {
    if (!streamId || !livekitStreamerRef.current) return;

    try {
      // Close LiveKit connection
      livekitStreamerRef.current.close();
      livekitStreamerRef.current = null;

      // End stream in database
      await fetch('/api/stream/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId }),
      });

      setIsLive(false);
      setRoomName('');
      setStreamId('');
      setMessages([]);
      setViewerCount(0);

      // Reset camera stream to video-only
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error ending live stream:', error);
    }
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !livekitStreamerRef.current || !session?.user) return;

    const message: LiveKitChatMessage = {
      id: Date.now().toString(),
      user: session.user.name || 'Anonymous',
      message: chatMessage.trim(),
      avatar: session.user.image || undefined,
      timestamp: Date.now(),
      isCreator: true,
    };

    livekitStreamerRef.current.sendChatMessage(message);
    setMessages((prev) => [...prev, message]);
    setChatMessage('');
  };

  const startRecording = async () => {
    if (!streamRef.current) return;

    try {
      // Get stream with audio for video recording
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });

      // Update stream ref and video element
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedVideoUrl(url);

        // Stop recording timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const retakeVideo = async () => {
    setRecordedBlob(null);
    setRecordedVideoUrl(null);
    setRecordingTime(0);
    setCaption('');

    // Restart camera stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: false,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  const postVideo = async () => {
    if (!recordedBlob) return;

    setIsPosting(true);

    try {
      const formData = new FormData();
      formData.append('file', recordedBlob, 'video.webm');
      formData.append('type', 'free');
      if (caption.trim()) {
        formData.append('title', caption.trim());
      }

      const uploadResponse = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        router.push('/');
      } else {
        const data = await uploadResponse.json();
        alert(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error posting video:', error);
      alert('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <CameraIcon className="h-16 w-16 text-gray-500 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Camera Access Required</h2>
        <p className="text-gray-400 text-center mb-4">
          Please allow camera access to take photos
        </p>
        <button
          onClick={() => setHasPermission(null)}
          className="px-6 py-2 bg-purple-600 text-white rounded-full"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-safe">
        <Link href="/" className="p-2">
          <X className="h-7 w-7 text-white" />
        </Link>
        <div className="flex items-center gap-4">
          {!capturedImage && (
            <button onClick={flipCamera} className="p-2">
              <FlipHorizontal className="h-6 w-6 text-white" />
            </button>
          )}
          <button className="p-2">
            <Settings className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>

      {/* Camera View / Captured Image */}
      <div
        className="flex-1 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isTransitioning ? 'transform 150ms ease-out' : 'none',
        }}
      >
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : recordedVideoUrl ? (
          <video
            src={recordedVideoUrl}
            controls
            autoPlay
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
        )}

        {/* Recording Timer */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-full">
              <Circle className="w-3 h-3 fill-white text-white animate-pulse" />
              <span className="text-white font-bold">{formatRecordingTime(recordingTime)}</span>
            </div>
          </div>
        )}

        {/* LIVE Mode Overlay - Category Selector */}
        {mode === 'LIVE' && !capturedImage && !isLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <h2 className="text-white text-3xl font-bold tracking-wider mb-2">OFFLINE</h2>
            <p className="text-gray-400 text-base mb-6">Select a category</p>

            <div className="flex gap-3">
              {/* IRL */}
              <button
                onClick={() => setSelectedCategory('IRL')}
                className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl transition-all ${
                  selectedCategory === 'IRL'
                    ? 'bg-purple-600 ring-2 ring-purple-400'
                    : 'bg-gray-800/80'
                }`}
              >
                <CameraIcon className="w-7 h-7 text-white mb-1" />
                <span className="text-white text-xs font-medium">IRL</span>
              </button>

              {/* Gaming */}
              <button
                onClick={() => setSelectedCategory('Gaming')}
                className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl transition-all ${
                  selectedCategory === 'Gaming'
                    ? 'bg-purple-600 ring-2 ring-purple-400'
                    : 'bg-gray-800/80'
                }`}
              >
                <Gamepad2 className="w-7 h-7 text-white mb-1" />
                <span className="text-white text-xs font-medium">Gaming</span>
              </button>

              {/* Music */}
              <button
                onClick={() => setSelectedCategory('Music')}
                className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl transition-all ${
                  selectedCategory === 'Music'
                    ? 'bg-purple-600 ring-2 ring-purple-400'
                    : 'bg-gray-800/80'
                }`}
              >
                <Music className="w-7 h-7 text-white mb-1" />
                <span className="text-white text-xs font-medium">Music</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Streaming UI */}
        {isLive && (
          <>
            {/* Top Bar - Live Indicator & Viewer Count */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-bold">LIVE</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full">
                <Eye className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-semibold">{viewerCount}</span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="absolute bottom-32 left-4 right-4 max-h-64 overflow-y-auto space-y-2">
              {messages.slice(-5).map((msg) => (
                <div
                  key={msg.id}
                  className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 max-w-[80%]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-semibold">{msg.user}</span>
                  </div>
                  <p className="text-white text-sm">{msg.message}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
        {isLive ? (
          /* Live Stream Controls */
          <div className="p-4 space-y-4">
            {/* Chat Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Send a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 rounded-xl border border-white/20 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatMessage.trim()}
                className="p-3 bg-purple-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            {/* End Stream Button */}
            <button
              onClick={endLive}
              className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl"
            >
              End Stream
            </button>
          </div>
        ) : capturedImage ? (
          /* Photo Preview Controls */
          <div className="p-4 space-y-4">
            {/* Caption Input */}
            <input
              type="text"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 rounded-xl border border-white/20 focus:outline-none focus:border-purple-500"
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={retakePhoto}
                className="flex-1 py-3 text-white font-semibold rounded-xl bg-white/20"
              >
                Retake
              </button>
              <button
                onClick={postPhoto}
                disabled={isPosting}
                className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {isPosting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Post
                  </>
                )}
              </button>
            </div>
          </div>
        ) : recordedVideoUrl ? (
          /* Video Preview Controls */
          <div className="p-4 space-y-4">
            {/* Caption Input */}
            <input
              type="text"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 rounded-xl border border-white/20 focus:outline-none focus:border-purple-500"
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={retakeVideo}
                className="flex-1 py-3 text-white font-semibold rounded-xl bg-white/20"
              >
                Retake
              </button>
              <button
                onClick={postVideo}
                disabled={isPosting}
                className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {isPosting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Post
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Camera Controls */
          <div className="p-4 pb-12">
            {/* Action Button - changes based on mode */}
            <div className="relative flex items-center justify-center mb-6">
              {/* Flip Camera Button - Left Side */}
              <button
                onClick={flipCamera}
                className="absolute left-8 p-3 bg-black/40 backdrop-blur-sm rounded-full"
              >
                <FlipHorizontal className="h-7 w-7 text-white" />
              </button>

              {mode === 'POST' ? (
                /* Capture Button for POST */
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-white" />
                </button>
              ) : mode === 'VIDEO' ? (
                /* Record/Stop Button for VIDEO */
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                    isRecording
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-white bg-transparent'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-10 h-10 text-red-500 fill-red-500" />
                  ) : (
                    <Circle className="w-10 h-10 text-red-500 fill-red-500" />
                  )}
                </button>
              ) : (
                /* Go Live Button for LIVE - only enabled when category is selected */
                <button
                  onClick={startLive}
                  disabled={!selectedCategory || isGoingLive}
                  className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                    selectedCategory && !isGoingLive
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-gray-500 bg-gray-500/20 opacity-50'
                  }`}
                >
                  {isGoingLive ? (
                    <Loader2 className="w-10 h-10 text-gray-500 animate-spin" />
                  ) : (
                    <Radio className={`w-10 h-10 ${selectedCategory ? 'text-red-500' : 'text-gray-500'}`} />
                  )}
                </button>
              )}
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setMode('POST')}
                className={`px-4 py-2 text-base font-semibold transition-colors ${
                  mode === 'POST' ? 'text-white' : 'text-gray-500'
                }`}
              >
                POST
              </button>
              <button
                onClick={() => setMode('VIDEO')}
                className={`px-4 py-2 text-base font-semibold transition-colors ${
                  mode === 'VIDEO' ? 'text-white' : 'text-gray-500'
                }`}
              >
                VIDEO
              </button>
              <button
                onClick={() => setMode('LIVE')}
                className={`px-4 py-2 text-base font-semibold transition-colors ${
                  mode === 'LIVE' ? 'text-white' : 'text-gray-500'
                }`}
              >
                LIVE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
