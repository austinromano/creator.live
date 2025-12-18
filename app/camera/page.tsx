'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { X, Settings, FlipHorizontal, Zap, Camera as CameraIcon, Loader2, Radio, Gamepad2, Music } from 'lucide-react';
import Link from 'next/link';

type CameraMode = 'POST' | 'LIVE';

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

  // Swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isTransitioning || capturedImage) return;
    touchStartX.current = e.touches[0].clientX;
    setSwipeOffset(0);
  }, [isTransitioning, capturedImage]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartX.current || isTransitioning || capturedImage) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    // Limit swipe based on current mode
    if (mode === 'POST' && diff > 0) return; // Can't swipe right on POST
    if (mode === 'LIVE' && diff < 0) return; // Can't swipe left on LIVE
    setSwipeOffset(diff * 0.3);
  }, [isTransitioning, mode, capturedImage]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || isTransitioning || capturedImage) return;

    const minSwipeDistance = 50;

    if (Math.abs(swipeOffset) > minSwipeDistance * 0.3) {
      if (swipeOffset < 0 && mode === 'POST') {
        // Swipe left - go to LIVE
        setIsTransitioning(true);
        setSwipeOffset(-50);
        setTimeout(() => {
          setMode('LIVE');
          setSwipeOffset(0);
          setIsTransitioning(false);
        }, 150);
      } else if (swipeOffset > 0 && mode === 'LIVE') {
        // Swipe right - go to POST
        setIsTransitioning(true);
        setSwipeOffset(50);
        setTimeout(() => {
          setMode('POST');
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
  }, [mode, swipeOffset, isTransitioning, capturedImage]);

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

    if (status === 'authenticated' && !capturedImage) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [status, facingMode, capturedImage]);

  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally if using front camera
    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    // Draw the video frame
    context.drawImage(video, 0, 0);

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

  const goToLive = () => {
    // Stop camera before navigating
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    // Pass selected category as query param
    const url = selectedCategory ? `/golive?category=${selectedCategory}` : '/golive';
    router.push(url);
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

        {/* LIVE Mode Overlay - Category Selector */}
        {mode === 'LIVE' && !capturedImage && (
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
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
        {capturedImage ? (
          /* Post Preview Controls */
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
              ) : (
                /* Go Live Button for LIVE - only enabled when category is selected */
                <button
                  onClick={goToLive}
                  disabled={!selectedCategory}
                  className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                    selectedCategory
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-gray-500 bg-gray-500/20 opacity-50'
                  }`}
                >
                  <Radio className={`w-10 h-10 ${selectedCategory ? 'text-red-500' : 'text-gray-500'}`} />
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
