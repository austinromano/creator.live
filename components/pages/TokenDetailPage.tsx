'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradingPanel } from '@/components/tokens/TradingPanel';
import { PriceChart } from '@/components/tokens/PriceChart';
import { BondingCurveProgress } from '@/components/tokens/BondingCurveProgress';
import { LiveStreamBroadcast } from '@/components/streaming/LiveStreamBroadcast';
import { LiveStreamViewer } from '@/components/streaming/LiveStreamViewer';
import { useWallet } from '@/hooks/useWallet';
import { useTokenStore } from '@/stores/tokenStore';
import { useViewerCount } from '@/hooks/useViewerCount';
import { Creator } from '@/lib/types';
import { 
  ExternalLink, 
  Twitter, 
  Globe, 
  MessageCircle,
  Radio,
  Eye,
  Users,
  TrendingUp,
  Clock,
  ArrowUpDown,
  Copy
} from 'lucide-react';

interface TokenDetailPageProps {
  creator: Creator;
}

export function TokenDetailPage({ creator }: TokenDetailPageProps) {
  const [activeTab, setActiveTab] = useState('chart');
  const { address, isConnected } = useWallet();
  const { updateToken } = useTokenStore();
  const currentViewerCount = useViewerCount({ 
    isLive: creator.isLive, 
    initialCount: creator.viewers || 0 
  });
  
  // Check if current user is the creator (simplified logic for demo)
  // In production, you'd compare wallet addresses or have a proper auth system
  // For demo: assume user is creator if token was created in last 10 minutes and wallet is connected
  const tokenAge = Date.now() - new Date(creator.created).getTime();
  const isCreator = isConnected && tokenAge < 10 * 60 * 1000; // 10 minutes
  
  const handleStreamStart = () => {
    updateToken(creator.symbol, { 
      isLive: true, 
      viewers: Math.floor(Math.random() * 50) + 10 // Start with 10-60 viewers
    });
  };
  
  const handleStreamStop = () => {
    updateToken(creator.symbol, { 
      isLive: false, 
      viewers: 0 
    });
  };

  // Update viewer count in real-time
  React.useEffect(() => {
    if (creator.isLive) {
      updateToken(creator.symbol, { viewers: currentViewerCount });
    }
  }, [currentViewerCount, creator.isLive, creator.symbol, updateToken]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16 ring-4 ring-purple-500/20">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-lg">
                  {creator.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-white">{creator.name}</h1>
                  {creator.isLive && (
                    <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 animate-pulse">
                      <Radio className="h-3 w-3 mr-1" />
                      LIVE
                    </Badge>
                  )}
                </div>
                <p className="text-purple-400 font-mono text-lg">${creator.symbol}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Created {formatTime(creator.created)}</span>
                  </span>
                  {creator.isLive && creator.viewers && (
                    <span className="flex items-center space-x-1 text-red-400">
                      <Eye className="h-4 w-4" />
                      <span>{formatNumber(creator.viewers)} watching</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Social Links */}
            <div className="flex items-center space-x-2">
              {creator.twitter && (
                <Button variant="outline" size="icon" asChild>
                  <a href={creator.twitter} target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {creator.website && (
                <Button variant="outline" size="icon" asChild>
                  <a href={creator.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {creator.telegram && (
                <Button variant="outline" size="icon" asChild>
                  <a href={creator.telegram} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {creator.isLive && (
                <Link href={`/live/${creator.symbol}`}>
                  <Button className="bg-red-600 hover:bg-red-700">
                    <Eye className="h-4 w-4 mr-2" />
                    Watch Live
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Description */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <p className="text-gray-300 text-lg leading-relaxed">{creator.description}</p>
            </CardContent>
          </Card>

          {/* Live Streaming Section */}
          {isCreator ? (
            /* Creator View - Broadcast Controls */
            <LiveStreamBroadcast
              tokenSymbol={creator.symbol}
              onStreamStart={handleStreamStart}
              onStreamStop={handleStreamStop}
              isStreaming={creator.isLive}
              viewerCount={currentViewerCount}
            />
          ) : creator.isLive ? (
            /* Viewer View - Watch Stream */
            <LiveStreamViewer 
              creator={creator}
              viewerCount={currentViewerCount}
            />
          ) : (
            /* Offline State */
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Creator Profile</CardTitle>
                  {!isCreator && (
                    <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                      Offline
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-gray-300">
                  <p>
                    {isCreator 
                      ? "Ready to go live? Use the broadcast controls above to start streaming!"
                      : "This creator is currently offline. Check back later for live streaming content!"
                    }
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-800/50 rounded">
                      <p className="text-2xl font-bold text-white">{formatNumber(creator.holders)}</p>
                      <p className="text-gray-400">Total Holders</p>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 rounded">
                      <p className="text-2xl font-bold text-white">{formatNumber(creator.transactions)}</p>
                      <p className="text-gray-400">Transactions</p>
                    </div>
                  </div>
                  
                  {isCreator && (
                    <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Radio className="h-5 w-5 text-blue-400 mt-1" />
                        <div>
                          <h4 className="text-blue-300 font-semibold">Creator Features</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            As the creator of {creator.symbol}, you can broadcast live to engage with your community and potential investors.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs for Chart, Holders, Transactions */}
          <Card className="bg-gray-900 border-gray-700">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-gray-800 w-full">
                <TabsTrigger value="chart" className="data-[state=active]:bg-purple-600">
                  Price Chart
                </TabsTrigger>
                <TabsTrigger value="holders" className="data-[state=active]:bg-purple-600">
                  Top Holders
                </TabsTrigger>
                <TabsTrigger value="transactions" className="data-[state=active]:bg-purple-600">
                  Recent Trades
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="chart" className="mt-0">
                <PriceChart
                  priceHistory={creator.priceHistory || []}
                  currentPrice={creator.price}
                  priceChange24h={creator.priceChange24h}
                  symbol={creator.symbol}
                  className="border-0 bg-transparent"
                />
              </TabsContent>
              
              <TabsContent value="holders" className="mt-0">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {creator.topHolders ? creator.topHolders.map((holder, index) => (
                      <div key={holder.address} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="border-purple-500 text-purple-300">
                            #{index + 1}
                          </Badge>
                          <div>
                            <p className="font-mono text-white">
                              {holder.address.slice(0, 8)}...{holder.address.slice(-8)}
                            </p>
                            <p className="text-sm text-gray-400">{holder.percentage.toFixed(1)}% of supply</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">
                            {formatNumber(holder.balance)} {creator.symbol}
                          </p>
                          <p className="text-sm text-gray-400">
                            ${formatNumber(holder.value)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(holder.address)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )) : (
                      <p className="text-gray-400 text-center py-8">No holder data available</p>
                    )}
                  </div>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="transactions" className="mt-0">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {creator.recentTrades ? creator.recentTrades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={trade.type === 'buy' ? 'default' : 'destructive'}
                            className={trade.type === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                          >
                            <ArrowUpDown className="h-3 w-3 mr-1" />
                            {trade.type.toUpperCase()}
                          </Badge>
                          <div>
                            <p className="font-mono text-white">
                              {trade.user.slice(0, 8)}...{trade.user.slice(-8)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {new Date(trade.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">
                            {trade.amount.toFixed(2)} SOL
                          </p>
                          <p className="text-sm text-gray-400">
                            {formatNumber(trade.tokens)} {creator.symbol}
                          </p>
                        </div>
                        <p className="text-sm text-gray-400">
                          ${trade.price.toFixed(6)}
                        </p>
                      </div>
                    )) : (
                      <p className="text-gray-400 text-center py-8">No recent trades</p>
                    )}
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Trading Sidebar - 1/3 width */}
        <div className="space-y-6">
          <TradingPanel creator={creator} />
          <BondingCurveProgress
            progress={creator.bondingCurve}
            marketCap={creator.marketCap}
          />
        </div>
      </div>
    </div>
  );
}