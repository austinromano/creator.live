export const PLATFORM_CONFIG = {
  name: 'OSHO',
  tagline: 'Where creators launch tokens and fans get rich',
  creationFee: 0.001, // SOL (much lower for testing)
  platformFee: 0.01, // 1%
  bondingCurveTarget: 85, // USD value in thousands
  raydiumMigrationThreshold: 85000, // Market cap threshold
};

export const TRADING_CONFIG = {
  defaultSlippage: 1, // 1%
  maxSlippage: 50, // 50%
  quickAmounts: [0.1, 0.5, 1, 5], // SOL amounts
  minTradeAmount: 0.001, // SOL
};

export const CHART_CONFIG = {
  timeframes: [
    { label: '1H', value: '1h' },
    { label: '6H', value: '6h' },
    { label: '1D', value: '1d' },
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
  ],
  colors: {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280',
  },
};

export const FILTER_OPTIONS = [
  { id: 'all', label: '🌟 All Tokens', value: 'all' },
  { id: 'live', label: '🔴 Live Streaming', value: 'live' },
  { id: 'new', label: '🚀 Just Launched', value: 'new' },
  { id: 'trending', label: '🔥 Trending', value: 'trending' },
  { id: 'completing', label: '💎 Near Completion', value: 'completing' },
];

export const SOCIAL_PLATFORMS = [
  { name: 'twitter', label: 'Twitter', icon: '🐦' },
  { name: 'telegram', label: 'Telegram', icon: '💬' },
  { name: 'website', label: 'Website', icon: '🌐' },
];

export const MOCK_WALLET_ADDRESS = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
export const MOCK_SOL_BALANCE = 12.5674;