import { Creator, ChatMessage, Trade, PricePoint, TokenHolder } from './types';

const generatePriceHistory = (basePrice: number): PricePoint[] => {
  const points: PricePoint[] = [];
  let currentPrice = basePrice * 0.8;
  const now = Date.now();
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = now - (i * 60 * 60 * 1000); // 24 hours ago to now
    const volatility = 0.05;
    const change = (Math.random() - 0.5) * volatility;
    currentPrice = Math.max(currentPrice * (1 + change), 0.001);
    
    points.push({
      timestamp,
      price: currentPrice,
      volume: Math.random() * 1000 + 100,
    });
  }
  
  return points;
};

export const mockCreators: Creator[] = [
  {
    id: '1',
    name: 'Luna Rivers',
    symbol: 'LUNA',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=b6e3f4,c0aede,d1d4f9',
    description: 'Gaming streamer and digital artist creating epic content daily! Join the Luna Army! 🌙',
    marketCap: 847652,
    price: 0.0847652,
    priceChange24h: 23.5,
    created: '2024-11-19T10:30:00Z',
    holders: 1247,
    transactions: 5832,
    volume24h: 125000,
    bondingCurve: 84.5,
    liquidity: 45000,
    isLive: true,
    viewers: 1842,
    twitter: 'https://twitter.com/lunarivers',
    website: 'https://lunarivers.com',
    telegram: 'https://t.me/lunaarmy',
    priceHistory: generatePriceHistory(0.0847652),
    topHolders: [
      { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', balance: 125000, percentage: 12.5, value: 10595.65 },
      { address: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi', balance: 98000, percentage: 9.8, value: 8307.2 },
      { address: 'AUFWnSEWyNqKsgEg9Y6WJD2m9b6FfkU3Zs7L8M9vfJ2', balance: 76000, percentage: 7.6, value: 6442.15 }
    ],
    recentTrades: [
      { id: '1', type: 'buy', amount: 1.2, tokens: 14157, price: 0.0848, slippage: 0.5, user: '9WzDX...AWWM', timestamp: new Date(Date.now() - 5000) },
      { id: '2', type: 'sell', amount: 0.8, tokens: 9500, price: 0.0842, slippage: 0.3, user: '4vJ9J...bLKi', timestamp: new Date(Date.now() - 15000) },
      { id: '3', type: 'buy', amount: 2.5, tokens: 29500, price: 0.0847, slippage: 0.8, user: 'AUFWN...vfJ2', timestamp: new Date(Date.now() - 30000) }
    ],
    messages: [
      { id: '1', user: 'CryptoWhal3', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=whale', message: 'Luna to the moon! 🚀', timestamp: new Date(Date.now() - 2000) },
      { id: '2', user: 'DiamondHands', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diamond', message: 'Just bought 50k LUNA!', tip: 0.1, timestamp: new Date(Date.now() - 8000) },
      { id: '3', user: 'Luna Rivers', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna', message: 'Thanks for the support fam! New game starting in 5 min 🎮', timestamp: new Date(Date.now() - 12000), isCreator: true }
    ]
  },
  {
    id: '2',
    name: 'Crypto Chef',
    symbol: 'CHEF',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chef&backgroundColor=ffdfbf,ffd5dc,c0aede',
    description: 'Cooking up profits in the kitchen and crypto! Daily cooking streams with alpha recipes 👨‍🍳',
    marketCap: 1250000,
    price: 0.125,
    priceChange24h: -5.2,
    created: '2024-11-18T15:45:00Z',
    holders: 892,
    transactions: 3421,
    volume24h: 85000,
    bondingCurve: 67.8,
    liquidity: 32000,
    isLive: false,
    twitter: 'https://twitter.com/cryptochef',
    priceHistory: generatePriceHistory(0.125),
    topHolders: [
      { address: 'BmF8ZzDsGYdLVL9zYtAWWM9WzDXwBbmkg8ZTbNMqUxvQ', balance: 89000, percentage: 8.9, value: 11125 },
      { address: 'JE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi4vJ9JU1bJJ', balance: 67000, percentage: 6.7, value: 8375 },
      { address: 'NqKsgEg9Y6WJD2m9b6FfkU3Zs7L8M9vfJ2AUFWnSEWy', balance: 52000, percentage: 5.2, value: 6500 }
    ]
  },
  {
    id: '3',
    name: 'Pixel Princess',
    symbol: 'PIXEL',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pixel&backgroundColor=ffd5dc,ffdfbf,d1d4f9',
    description: 'NFT artist & pixel art queen! Creating beautiful 8-bit worlds daily ✨',
    marketCap: 2100000,
    price: 0.21,
    priceChange24h: 45.8,
    created: '2024-11-17T08:20:00Z',
    holders: 1567,
    transactions: 8934,
    volume24h: 195000,
    bondingCurve: 93.2,
    liquidity: 78000,
    isLive: true,
    viewers: 3204,
    twitter: 'https://twitter.com/pixelprincess',
    website: 'https://pixelprincess.art',
    priceHistory: generatePriceHistory(0.21)
  },
  {
    id: '4',
    name: 'Bass Drop Bobby',
    symbol: 'BASS',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bobby&backgroundColor=c0aede,b6e3f4,ffdfbf',
    description: 'Electronic music producer dropping beats and alpha! Rave culture meets DeFi 🎵',
    marketCap: 650000,
    price: 0.065,
    priceChange24h: 12.1,
    created: '2024-11-19T12:15:00Z',
    holders: 743,
    transactions: 2156,
    volume24h: 42000,
    bondingCurve: 45.3,
    liquidity: 18500,
    isLive: false,
    twitter: 'https://twitter.com/bassdropbobby',
    priceHistory: generatePriceHistory(0.065)
  },
  {
    id: '5',
    name: 'Fitness Guru Max',
    symbol: 'GAINS',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max&backgroundColor=d1d4f9,b6e3f4,ffd5dc',
    description: 'Building muscles and portfolios! Daily workouts and crypto gains 💪',
    marketCap: 450000,
    price: 0.045,
    priceChange24h: 8.7,
    created: '2024-11-18T20:30:00Z',
    holders: 567,
    transactions: 1834,
    volume24h: 28000,
    bondingCurve: 32.1,
    liquidity: 12000,
    isLive: true,
    viewers: 891,
    telegram: 'https://t.me/gainswithmax',
    priceHistory: generatePriceHistory(0.045)
  },
  {
    id: '6',
    name: 'Tech Wizard',
    symbol: 'TECH',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wizard&backgroundColor=ffdfbf,c0aede,d1d4f9',
    description: 'Coding tutorials and blockchain deep dives. Learn while you earn! 🧙‍♂️',
    marketCap: 890000,
    price: 0.089,
    priceChange24h: -2.4,
    created: '2024-11-16T14:10:00Z',
    holders: 1023,
    transactions: 4567,
    volume24h: 67000,
    bondingCurve: 71.5,
    liquidity: 35000,
    isLive: false,
    website: 'https://techwizard.dev',
    twitter: 'https://twitter.com/techwizardlive',
    priceHistory: generatePriceHistory(0.089)
  }
];

export const getCreatorBySymbol = (symbol: string): Creator | undefined => {
  return mockCreators.find(creator => creator.symbol === symbol);
};

export const getFilteredCreators = (filter: string): Creator[] => {
  switch (filter) {
    case 'live':
      return mockCreators.filter(creator => creator.isLive);
    case 'new':
      return [...mockCreators].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    case 'trending':
      return [...mockCreators].sort((a, b) => b.priceChange24h - a.priceChange24h);
    case 'completing':
      return [...mockCreators].sort((a, b) => b.bondingCurve - a.bondingCurve);
    default:
      return mockCreators;
  }
};

export const getKingOfHill = (): Creator => {
  return [...mockCreators].sort((a, b) => b.marketCap - a.marketCap)[0];
};