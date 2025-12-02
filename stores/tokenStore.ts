'use client';
import { create } from 'zustand';
import { Creator } from '@/lib/types';
import { mockCreators } from '@/lib/mock-data';

interface CreateTokenInput {
  name: string;
  symbol: string;
  avatar: string;
  description: string;
  isLive: boolean;
  creatorId: string;
  twitter?: string;
  website?: string;
  telegram?: string;
}

interface DbToken {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  avatar: string | null;
  creatorAddress: string;
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  bondingCurve: number;
  liquidity: number;
  holders: number;
  transactions: number;
  isLive: boolean;
  viewers: number;
  twitter: string | null;
  website: string | null;
  telegram: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TokenState {
  tokens: Creator[];
  loading: boolean;
  initialized: boolean;
  fetchTokens: () => Promise<void>;
  addToken: (tokenData: CreateTokenInput) => Promise<Creator>;
  getTokenBySymbol: (symbol: string) => Creator | undefined;
  getTokenByCreator: (creatorId: string) => Creator | undefined;
  updateToken: (symbol: string, updates: Partial<Creator>) => void;
}

const generateInitialPriceHistory = (initialPrice: number) => {
  const points = [];
  const now = Date.now();

  for (let i = 23; i >= 0; i--) {
    const timestamp = now - (i * 60 * 60 * 1000);
    const variation = (Math.random() - 0.5) * 0.1;
    const price = Math.max(initialPrice * (1 + variation), 0.00001);

    points.push({
      timestamp,
      price,
      volume: Math.random() * 100 + 10,
    });
  }

  return points;
};

// Convert database token to Creator type
const dbTokenToCreator = (dbToken: DbToken): Creator => {
  const initialPrice = dbToken.price || 0.00001;

  return {
    id: dbToken.id,
    name: dbToken.name,
    symbol: dbToken.symbol,
    description: dbToken.description || '',
    avatar: dbToken.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbToken.symbol}`,
    creatorAddress: dbToken.creatorAddress,
    price: dbToken.price,
    marketCap: dbToken.marketCap,
    volume24h: dbToken.volume24h,
    priceChange24h: dbToken.priceChange24h,
    bondingCurve: dbToken.bondingCurve,
    liquidity: dbToken.liquidity,
    holders: dbToken.holders,
    transactions: dbToken.transactions,
    isLive: dbToken.isLive,
    viewers: dbToken.viewers,
    twitter: dbToken.twitter || undefined,
    website: dbToken.website || undefined,
    telegram: dbToken.telegram || undefined,
    created: dbToken.createdAt,
    priceHistory: generateInitialPriceHistory(initialPrice),
    topHolders: [{
      address: dbToken.creatorAddress.slice(0, 8) + '...',
      balance: 1000000,
      percentage: 100,
      value: initialPrice * 1000000,
    }],
    recentTrades: [],
    messages: [{
      id: '1',
      user: dbToken.name,
      message: `Welcome to $${dbToken.symbol}!`,
      timestamp: new Date(dbToken.createdAt),
      isCreator: true,
      avatar: dbToken.avatar || undefined,
    }],
    bondingCurveType: 'linear',
    category: 'entertainment',
    verificationLevel: 'none',
    trustScore: 50,
    isVerified: false,
    revenueSharing: {
      enabled: false,
      holderPercentage: 0,
      totalDistributed: 0,
    },
    staking: {
      enabled: false,
      totalStaked: 0,
      apy: 0,
    },
    tradingLimits: {
      maxBuyPerTx: 1000,
      maxSellPerTx: 1000,
      cooldownPeriod: 0,
    },
    followers: 0,
    following: 0,
    totalLikes: 0,
  };
};

export const useTokenStore = create<TokenState>()((set, get) => ({
  tokens: mockCreators,
  loading: false,
  initialized: false,

  fetchTokens: async () => {
    if (get().loading) return;

    set({ loading: true });

    try {
      const response = await fetch('/api/tokens');
      if (response.ok) {
        const dbTokens: DbToken[] = await response.json();
        const creatorTokens = dbTokens.map(dbTokenToCreator);

        // Merge database tokens with mock creators
        // Database tokens take priority (shown first)
        set({
          tokens: [...creatorTokens, ...mockCreators],
          initialized: true,
          loading: false,
        });
      } else {
        console.error('Failed to fetch tokens');
        set({ loading: false, initialized: true });
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      set({ loading: false, initialized: true });
    }
  },

  addToken: async (tokenData: CreateTokenInput): Promise<Creator> => {
    const initialPrice = 0.00001;

    try {
      // Create token in database
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tokenData.name,
          symbol: tokenData.symbol,
          description: tokenData.description,
          avatar: tokenData.avatar,
          creatorAddress: tokenData.creatorId,
          twitter: tokenData.twitter,
          website: tokenData.website,
          telegram: tokenData.telegram,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create token');
      }

      const dbToken: DbToken = await response.json();
      const newToken = dbTokenToCreator(dbToken);

      set((state) => ({
        tokens: [newToken, ...state.tokens],
      }));

      return newToken;
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  },

  getTokenBySymbol: (symbol: string) => {
    return get().tokens.find(token => token.symbol.toLowerCase() === symbol.toLowerCase());
  },

  getTokenByCreator: (creatorId: string) => {
    return get().tokens.find(token => token.creatorAddress === creatorId);
  },

  updateToken: (symbol: string, updates: Partial<Creator>) => {
    set((state) => ({
      tokens: state.tokens.map(token =>
        token.symbol.toLowerCase() === symbol.toLowerCase()
          ? { ...token, ...updates }
          : token
      ),
    }));

    // Also update in database (fire and forget)
    fetch(`/api/tokens/${symbol}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(console.error);
  },
}));
