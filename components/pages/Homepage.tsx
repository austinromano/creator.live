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
      <LiveStreamGrid />


      {/* Token Grid */}
      <TokenGrid creators={tokens} loading={loading} />
    </div>
  );
}