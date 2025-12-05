'use client';
import React from 'react';
import { LiveStreamGrid } from '@/components/live/LiveStreamGrid';

export function Homepage() {
  return (
    <>
      {/* Mobile - no container padding */}
      <div className="lg:hidden">
        <LiveStreamGrid />
      </div>

      {/* Desktop - with container */}
      <div className="hidden lg:block container mx-auto px-4 py-8">
        <LiveStreamGrid />
      </div>
    </>
  );
}