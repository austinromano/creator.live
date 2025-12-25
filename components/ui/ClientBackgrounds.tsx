'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import heavy animation components with no SSR
// This reduces initial bundle size significantly
const StarField = dynamic(() => import('./StarField').then(mod => ({ default: mod.StarField })), {
  ssr: false,
  loading: () => null, // No loading state - just render nothing until loaded
});

const AuroraBorealis = dynamic(() => import('./AuroraBorealis').then(mod => ({ default: mod.AuroraBorealis })), {
  ssr: false,
  loading: () => null,
});

export function ClientBackgrounds() {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Don't render heavy animations if user prefers reduced motion
  if (!mounted || reducedMotion) {
    return null;
  }

  return (
    <>
      <StarField />
    </>
  );
}
