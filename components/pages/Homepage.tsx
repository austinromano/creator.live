'use client';
import React from 'react';
import { LiveStreamGrid } from '@/components/live/LiveStreamGrid';

export function Homepage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Live Streams */}
      <LiveStreamGrid />
    </div>
  );
}