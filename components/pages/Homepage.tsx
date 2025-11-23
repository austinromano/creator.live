'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TokenGrid } from '@/components/tokens/TokenGrid';
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
      {/* Hero Section */}
      <section className="text-center space-y-4 py-12">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500 bg-clip-text text-transparent">
          Where creators launch tokens
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          The ultimate platform for content creators to launch their own tokens with bonding curves, 
          go live stream, and let fans trade their tokens.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <div className="flex items-center space-x-2 text-green-400">
            <DollarSign className="h-5 w-5" />
            <span className="font-semibold">${formatNumber(totalVolume)} 24h Volume</span>
          </div>
          <div className="flex items-center space-x-2 text-blue-400">
            <Users className="h-5 w-5" />
            <span className="font-semibold">{formatNumber(totalHolders)} Holders</span>
          </div>
          <div className="flex items-center space-x-2 text-red-400">
            <Eye className="h-5 w-5" />
            <span className="font-semibold">{liveCount} Live Now</span>
          </div>
        </div>
      </section>

      {/* King of the Hill */}
      {kingOfHill && (
        <section className="mb-8">
          <Card className="relative overflow-hidden bg-gradient-to-r from-yellow-600/20 via-orange-600/20 to-red-600/20 border-yellow-500/50">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-red-500/10" />
            <div className="relative p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Crown className="h-6 w-6 text-yellow-500" />
                <h2 className="text-xl font-bold text-white">King of the Hill</h2>
                <Badge variant="secondary" className="bg-yellow-600 hover:bg-yellow-700">
                  Highest Market Cap
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 ring-4 ring-yellow-500/50">
                  <AvatarImage src={kingOfHill.avatar} alt={kingOfHill.name} />
                  <AvatarFallback className="bg-gradient-to-br from-yellow-600 to-orange-600">
                    {kingOfHill.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{kingOfHill.name}</h3>
                  <p className="text-yellow-400 font-mono">${kingOfHill.symbol}</p>
                  <p className="text-gray-300 text-sm">{kingOfHill.description}</p>
                </div>
                
                <div className="text-right space-y-1">
                  <p className="text-2xl font-bold text-white">
                    ${formatNumber(kingOfHill.marketCap)}
                  </p>
                  <div className="flex items-center space-x-1 text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    <span>+{kingOfHill.priceChange24h.toFixed(1)}%</span>
                  </div>
                  <Link href={`/token/${kingOfHill.symbol}`}>
                    <Button 
                      size="sm" 
                      className="bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
                    >
                      Trade Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

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