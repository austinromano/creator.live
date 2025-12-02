'use client';
import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { LiveStreamPage } from '@/components/pages/LiveStreamPage';
import { useTokenStore } from '@/stores/tokenStore';
import { Creator } from '@/lib/types';

interface LivePageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default function LivePage({ params }: LivePageProps) {
  const resolvedParams = React.use(params);
  const { getTokenBySymbol, fetchTokens, initialized, tokens } = useTokenStore();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      // First ensure tokens are fetched from database
      if (!initialized) {
        await fetchTokens();
      }

      // Then look up the token
      const token = getTokenBySymbol(resolvedParams.symbol);
      setCreator(token || null);
      setLoading(false);
    };

    loadToken();
  }, [resolvedParams.symbol, initialized, fetchTokens, getTokenBySymbol]);

  // Also update when tokens change (in case fetchTokens completes)
  useEffect(() => {
    if (initialized) {
      const token = getTokenBySymbol(resolvedParams.symbol);
      setCreator(token || null);
      setLoading(false);
    }
  }, [tokens, initialized, resolvedParams.symbol, getTokenBySymbol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (!creator) {
    notFound();
  }

  // Allow viewing even if not marked as live - the StreamPlayer will show
  // "Waiting for broadcaster" if no stream is available. This enables
  // viewers to wait for a stream to start.
  // Force isLive to true so StreamPlayer attempts connection
  const creatorWithLive = { ...creator, isLive: true };

  return <LiveStreamPage creator={creatorWithLive} />;
}
