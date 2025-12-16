'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { LiveKitStreamer } from '@/lib/livekit-stream';
import { isAudioUnlocked, onAudioUnlock, offAudioUnlock } from '@/lib/audio-unlock';
import { TIME, USER_INTERACTION_EVENTS } from '@/lib/constants';

interface UseStreamConnectionOptions {
  roomName: string;
  isLive: boolean;
  muteAudio?: boolean;
  autoConnect?: boolean;
  connectOnHover?: boolean;
}

interface UseStreamConnectionReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Custom hook to manage LiveKit stream connections
 * Extracts duplicate connection logic from stream card components
 */
export function useStreamConnection({
  roomName,
  isLive,
  muteAudio = true,
  autoConnect = true,
  connectOnHover = false,
}: UseStreamConnectionOptions): UseStreamConnectionReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamerRef = useRef<LiveKitStreamer | null>(null);
  const hasTriedPlay = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [shouldConnect, setShouldConnect] = useState(autoConnect && !connectOnHover);

  // Try to play video
  const tryPlay = useCallback(() => {
    if (!videoRef.current) return;

    videoRef.current.muted = true;
    videoRef.current.play()
      .then(() => {
        setIsConnected(true);
        hasTriedPlay.current = true;
      })
      .catch(() => {
        // Silently fail - will retry on user interaction
      });
  }, []);

  // Connect to stream
  const connect = useCallback(() => {
    setShouldConnect(true);
  }, []);

  // Disconnect from stream
  const disconnect = useCallback(() => {
    if (streamerRef.current) {
      streamerRef.current.close();
      streamerRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    hasTriedPlay.current = false;
    setShouldConnect(false);
  }, []);

  // Main connection effect
  useEffect(() => {
    let mounted = true;

    // Skip connection for demo streams (they don't have real video)
    const isDemoStream = roomName.startsWith('demo-');
    if (!isLive || !videoRef.current || !shouldConnect || isDemoStream) {
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
        setIsConnected(false);
        setIsConnecting(false);
        hasTriedPlay.current = false;
      }
      return;
    }

    // Prevent duplicate connections
    if (streamerRef.current) {
      return;
    }

    const connectToStream = async () => {
      if (!mounted) return;
      setIsConnecting(true);
      setError(null);

      streamerRef.current = new LiveKitStreamer(roomName);

      try {
        await streamerRef.current.startViewingWithElement(
          videoRef.current!,
          () => {
            if (mounted) tryPlay();
          },
          undefined,
          { muteAudio }
        );
      } catch (err) {
        if (mounted) {
          console.error('Failed to connect to stream preview:', err);
          setError(err instanceof Error ? err : new Error('Connection failed'));
        }
      } finally {
        if (mounted) {
          setIsConnecting(false);
        }
      }
    };

    connectToStream();

    return () => {
      mounted = false;
      if (streamerRef.current) {
        streamerRef.current.close();
        streamerRef.current = null;
      }
    };
  }, [isLive, roomName, shouldConnect, muteAudio, tryPlay]);

  // Listen for user interaction to trigger play (iOS Safari fix)
  useEffect(() => {
    if (isConnected) return;

    const handleInteraction = () => {
      if (videoRef.current?.srcObject && !isConnected) {
        tryPlay();
      }
    };

    // Use consistent options object for add/remove
    const options = { passive: true, capture: true };
    USER_INTERACTION_EVENTS.forEach(event => {
      document.addEventListener(event, handleInteraction, options);
    });

    return () => {
      USER_INTERACTION_EVENTS.forEach(event => {
        // Must match the capture flag exactly
        document.removeEventListener(event, handleInteraction, { capture: true });
      });
    };
  }, [isConnected, tryPlay]);

  // Register callback for audio unlock with proper cleanup
  useEffect(() => {
    if (isConnected) return;

    const unlockCallback = () => {
      if (videoRef.current?.srcObject) {
        tryPlay();
      }
    };

    onAudioUnlock(unlockCallback);

    // Cleanup: remove callback when effect re-runs or unmounts
    return () => {
      offAudioUnlock(unlockCallback);
    };
  }, [isConnected, tryPlay]);

  // Poll for srcObject availability (with early exit when connected)
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(() => {
      // Early exit if already connected
      if (hasTriedPlay.current) {
        clearInterval(interval);
        return;
      }
      if (videoRef.current?.srcObject && isAudioUnlocked()) {
        tryPlay();
      }
    }, TIME.VIDEO_PLAY_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isConnected, tryPlay]);

  return {
    videoRef,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  };
}
