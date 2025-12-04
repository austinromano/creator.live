'use client';

import { useEffect } from 'react';
import { setupAutoUnlock } from '@/lib/audio-unlock';

export function AudioUnlockProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupAutoUnlock();
  }, []);

  return <>{children}</>;
}
