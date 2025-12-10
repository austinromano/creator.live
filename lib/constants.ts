/**
 * Application constants
 * Centralized configuration values to avoid magic numbers/strings
 */

// Platform configuration
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

// Time-related constants (in milliseconds)
export const TIME = {
  ONLINE_THRESHOLD: 2 * 60 * 1000, // 2 minutes - user considered online if seen within this time
  STREAM_POLLING_INTERVAL: 5000, // 5 seconds - how often to refresh stream list
  THUMBNAIL_REFRESH_INTERVAL: 15000, // 15 seconds - how often to refresh stream thumbnails
  VIDEO_PLAY_POLL_INTERVAL: 300, // 300ms - how often to check if video can play
  HEARTBEAT_INTERVAL: 30000, // 30 seconds - heartbeat for online status
} as const;

// File size limits (in bytes)
export const FILE_LIMITS = {
  AVATAR_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  COVER_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  POST_MAX_SIZE: 50 * 1024 * 1024, // 50MB
  POST_VIDEO_MAX_SIZE: 100 * 1024 * 1024, // 100MB
} as const;

// UI Colors (for consistency across modals/components)
export const COLORS = {
  MODAL_BG: '#1a1525',
  DARK_BG: '#0f0a15',
  CARD_BG: '#1f1f23',
  BORDER: '#2d2d35',
} as const;

// Stream categories
export const STREAM_CATEGORIES = ['IRL', 'Gaming', 'Music'] as const;
export type StreamCategory = typeof STREAM_CATEGORIES[number];

// Mobile navigation tabs
export const MOBILE_TABS = ['For You', 'Popular', 'IRL', 'Gaming', 'Music'] as const;
export type MobileTab = typeof MOBILE_TABS[number];

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  FEED_PAGE_SIZE: 10,
  NOTIFICATIONS_PAGE_SIZE: 20,
} as const;

// Media aspect ratios
export const ASPECT_RATIOS = {
  STREAM_PREVIEW: '4/3',
  STREAM_CARD_MOBILE: '1/1',
  POST_IMAGE: '4/5',
  AVATAR: '1/1',
  COVER: '3/1',
} as const;

// User interaction events (for audio unlock, etc.)
export const USER_INTERACTION_EVENTS = [
  'touchstart',
  'touchend',
  'click',
  'scroll',
] as const;

// API endpoints (relative paths)
export const API_ENDPOINTS = {
  STREAMS: {
    LIVE: '/api/streams/live',
    START: '/api/stream/start',
    END: '/api/stream/end',
    THUMBNAIL: '/api/stream/thumbnail',
  },
  USER: {
    PROFILE: '/api/user/profile',
    AVATAR: '/api/user/avatar',
    COVER: '/api/user/cover',
    FOLLOW: '/api/user/follow',
    FRIENDS: '/api/user/friends',
  },
  FEED: '/api/feed',
  NOTIFICATIONS: '/api/notifications',
  SPARKS: '/api/sparks',
  POSTS: {
    CREATE: '/api/posts/create',
    LIST: '/api/posts',
  },
} as const;

// LiveKit configuration
export const LIVEKIT = {
  VIEWER_ID_PREFIX: 'viewer-',
} as const;

// Validation patterns
export const VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  USERNAME_PATTERN: /^[a-zA-Z0-9_]+$/,
  BIO_MAX_LENGTH: 500,
  DISPLAY_NAME_MAX_LENGTH: 50,
  STREAM_TITLE_MAX_LENGTH: 100,
} as const;
