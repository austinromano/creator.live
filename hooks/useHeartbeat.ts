'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function useHeartbeat() {
  const { data: session, status } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only start heartbeat when authenticated
    if (status !== 'authenticated' || !session?.user) {
      return;
    }

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/user/heartbeat', {
          method: 'POST',
        });
      } catch (error) {
        // Silently fail - heartbeat is not critical
        console.debug('Heartbeat failed:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval for regular heartbeats
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Also send heartbeat on visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, status]);
}
