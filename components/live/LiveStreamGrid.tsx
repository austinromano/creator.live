'use client';
import React from 'react';
import { LiveStreamCard } from './LiveStreamCard';
import { Creator } from '@/lib/types';
import { Radio } from 'lucide-react';

interface LiveStreamGridProps {
  creators: Creator[];
}

export function LiveStreamGrid({ creators }: LiveStreamGridProps) {
  const liveCreators = creators.filter(c => c.isLive);

  if (liveCreators.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center space-x-3 mb-4">
        <Radio className="h-6 w-6 text-red-500 animate-pulse" />
        <h2 className="text-2xl font-bold text-white">Live Now</h2>
        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
          {liveCreators.length}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {liveCreators.map((creator) => (
          <LiveStreamCard key={creator.id} creator={creator} />
        ))}
      </div>
    </section>
  );
}
