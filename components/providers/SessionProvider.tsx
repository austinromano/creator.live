'use client';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider
      // Refetch session every 2 minutes to keep it fresh on mobile
      refetchInterval={2 * 60}
      // Refetch when window regains focus (important for mobile)
      refetchOnWindowFocus={true}
      // Refetch when coming back online
      refetchWhenOffline={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
