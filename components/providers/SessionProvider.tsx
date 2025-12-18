'use client';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  // Track online/offline status for mobile
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <NextAuthSessionProvider
      // Refetch session every 60 seconds to keep it fresh on mobile
      refetchInterval={60}
      // Refetch when window regains focus (critical for mobile app resume)
      refetchOnWindowFocus={true}
      // Only refetch when online
      refetchWhenOffline={false}
      // Base path for auth API
      basePath="/api/auth"
    >
      {children}
    </NextAuthSessionProvider>
  );
}
