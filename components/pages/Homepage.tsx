'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TokenGrid } from '@/components/tokens/TokenGrid';
import { LiveStreamGrid } from '@/components/live/LiveStreamGrid';
import { useTokens } from '@/hooks/useTokens';
import { FILTER_OPTIONS } from '@/lib/constants';
import {
  Crown,
  TrendingUp,
  Eye,
  Users,
  DollarSign,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export function Homepage() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';
  const { tokens, loading, filter, setFilter, refreshTokens, kingOfHill } = useTokens();

  useEffect(() => {
    if (initialFilter !== filter) {
      setFilter(initialFilter);
    }
  }, [initialFilter, filter, setFilter]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(6)}`;
  };

  const liveCount = tokens.filter(t => t.isLive).length;
  const totalVolume = tokens.reduce((acc, t) => acc + t.volume24h, 0);
  const totalHolders = tokens.reduce((acc, t) => acc + t.holders, 0);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Live Streams */}
      <LiveStreamGrid creators={tokens} />

      {/* Filters */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant={filter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(option.value)}
                className={
                  filter === option.value
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "border-gray-600 text-gray-300 hover:border-purple-500 hover:text-white"
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTokens}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:border-purple-500 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            <span>
              {filter === 'all' ? 'All Creators' : 
               filter === 'live' ? 'Live Streaming' :
               filter === 'new' ? 'Just Launched' :
               filter === 'trending' ? 'Trending' :
               'Near Completion'}
            </span>
          </h2>
          <p className="text-gray-400">
            {loading ? 'Loading...' : `${tokens.length} creators found`}
          </p>
        </div>
      </section>

      {/* Token Grid */}
      <TokenGrid creators={tokens} loading={loading} />
    </div>
  );
}