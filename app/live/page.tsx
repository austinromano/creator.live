'use client';
import React from 'react';
import { LiveStreamGrid } from '@/components/live/LiveStreamGrid';

export default function LivePage() {
  return (
    <>
      {/* Mobile - no container padding, remove top padding from layout */}
      <div className="lg:hidden -mt-14">
        <LiveStreamGrid />
      </div>

      {/* Desktop - with container */}
      <div className="hidden lg:block container mx-auto px-4 py-8">
        <LiveStreamGrid />
      </div>
    </>
  );
}
