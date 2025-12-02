'use client';
import { useState, useEffect } from 'react';
import { Creator } from '@/lib/types';
import { useTokenStore } from '@/stores/tokenStore';

const getFilteredTokens = (tokens: Creator[], filter: string): Creator[] => {
  switch (filter) {
    case 'live':
      return tokens.filter(creator => creator.isLive);
    case 'new':
      return [...tokens].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    case 'trending':
      return [...tokens].sort((a, b) => b.priceChange24h - a.priceChange24h);
    case 'completing':
      return [...tokens].sort((a, b) => b.bondingCurve - a.bondingCurve);
    default:
      return tokens;
  }
};

const getKingOfHill = (tokens: Creator[]): Creator | undefined => {
  if (tokens.length === 0) return undefined;
  return [...tokens].sort((a, b) => b.marketCap - a.marketCap)[0];
};

export const useTokens = () => {
  const { tokens: allTokens, loading: storeLoading, initialized, fetchTokens } = useTokenStore();
  const [filter, setFilter] = useState('all');

  // Fetch tokens from database on mount
  useEffect(() => {
    if (!initialized) {
      fetchTokens();
    }
  }, [initialized, fetchTokens]);

  const tokens = getFilteredTokens(allTokens, filter);

  const refreshTokens = () => {
    fetchTokens();
  };

  return {
    tokens,
    loading: storeLoading,
    filter,
    setFilter,
    refreshTokens,
    kingOfHill: getKingOfHill(allTokens),
  };
};
