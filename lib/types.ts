export interface Creator {
  id: string;
  name: string;
  symbol: string;
  avatar: string;
  description: string;
  marketCap: number;
  price: number;
  priceChange24h: number;
  created: string;
  holders: number;
  transactions: number;
  volume24h: number;
  bondingCurve: number;
  liquidity: number;
  isLive: boolean;
  viewers?: number;
  twitter?: string;
  website?: string;
  telegram?: string;
  messages?: ChatMessage[];
  priceHistory?: PricePoint[];
  topHolders?: TokenHolder[];
  recentTrades?: Trade[];
}

export interface ChatMessage {
  id: string;
  user: string;
  avatar?: string;
  message: string;
  tip?: number;
  timestamp: Date;
  isCreator?: boolean;
}

export interface Trade {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  tokens: number;
  price: number;
  slippage: number;
  user: string;
  timestamp: Date;
}

export interface PricePoint {
  timestamp: number;
  price: number;
  volume: number;
}

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  value: number;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  connect: () => void;
  disconnect: () => void;
}

export interface TradingState {
  selectedToken: Creator | null;
  tradeType: 'buy' | 'sell';
  amount: string;
  slippage: number;
  setSelectedToken: (token: Creator | null) => void;
  setTradeType: (type: 'buy' | 'sell') => void;
  setAmount: (amount: string) => void;
  setSlippage: (slippage: number) => void;
  executeTrade: () => Promise<void>;
}

export type FilterType = 'live' | 'new' | 'trending' | 'completing';