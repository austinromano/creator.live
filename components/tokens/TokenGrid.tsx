'use client';
import React from 'react';
import { TokenCard } from './TokenCard';
import { Creator } from '@/lib/types';
import { useTradingStore } from '@/stores/tradingStore';

interface TokenGridProps {
  creators: Creator[];
  loading?: boolean;
}

export function TokenGrid({ creators, loading }: TokenGridProps) {
  const { setSelectedToken, setTradeType } = useTradingStore();

  const handleQuickBuy = (creator: Creator) => {
    setSelectedToken(creator);
    setTradeType('buy');
    // In a real app, this would open a trading modal
    console.log('Quick buy triggered for', creator.symbol);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="h-96 bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No creators found</div>
        <p className="text-gray-500">Try adjusting your filters or check back later</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {creators.map((creator) => (
        <TokenCard 
          key={creator.id} 
          creator={creator} 
          onQuickBuy={handleQuickBuy}
        />
      ))}
    </div>
  );
}