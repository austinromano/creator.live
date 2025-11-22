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

const getKingOfHill = (tokens: Creator[]): Creator => {
  return [...tokens].sort((a, b) => b.marketCap - a.marketCap)[0];
};

export const useTokens = () => {
  const { tokens: allTokens } = useTokenStore();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const tokens = getFilteredTokens(allTokens, filter);

  const refreshTokens = () => {
    setLoading(true);
    // Simulate API refresh
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  return {
    tokens,
    loading,
    filter,
    setFilter,
    refreshTokens,
    kingOfHill: getKingOfHill(allTokens),
  };
};