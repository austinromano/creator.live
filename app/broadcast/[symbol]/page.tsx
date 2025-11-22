'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTokenStore } from '@/stores/tokenStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Radio,
  StopCircle,
  Users,
  TrendingUp,
  DollarSign,
  Settings,
  BarChart3,
  MessageSquare,
  Loader2,
  Play,
  Eye,
} from 'lucide-react';
import { LiveStreamBroadcast } from '@/components/streaming/LiveStreamBroadcast';

export default function BroadcastPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { getTokenBySymbol, updateToken } = useTokenStore();
  const [isLive, setIsLive] = useState(false);

  const symbol = params.symbol as string;
  const token = getTokenBySymbol(symbol);
  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (token && user && token.creatorAddress !== user.id) {
      // Not the token creator, redirect to token page
      router.push(`/token/${symbol}`);
    }
  }, [token, user, symbol, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="bg-gray-900 border-gray-800 p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Token Not Found</h2>
          <p className="text-gray-400 mb-6">
            The token you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push('/')}>Back to Home</Button>
        </Card>
      </div>
    );
  }

  const handleGoLive = () => {
    setIsLive(true);
    updateToken(symbol, { isLive: true });
  };

  const handleEndStream = () => {
    setIsLive(false);
    updateToken(symbol, { isLive: false });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 border-2 border-purple-500">
              <AvatarImage src={token.avatar} />
              <AvatarFallback>{token.symbol}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-white">{token.name}</h1>
              <p className="text-gray-400 font-mono">{token.symbol}</p>
            </div>
          </div>
          {isLive && (
            <Badge className="bg-red-600 text-white px-4 py-2 text-lg animate-pulse">
              <Radio className="h-5 w-5 mr-2" />
              LIVE
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Market Cap</p>
                <p className="text-xl font-bold text-white">
                  ${token.marketCap.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Holders</p>
                <p className="text-xl font-bold text-white">{token.holders}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">24h Volume</p>
                <p className="text-xl font-bold text-white">
                  {token.volume24h.toFixed(2)} SOL
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Current Viewers</p>
                <p className="text-xl font-bold text-white">
                  {token.viewers || 0}
                </p>
              </div>
              <Eye className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broadcast Section */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Live Broadcast</h2>
                <p className="text-gray-400">
                  Share your screen and connect with your community
                </p>
              </div>
              {!isLive ? (
                <Button
                  onClick={handleGoLive}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Go Live
                </Button>
              ) : (
                <Button
                  onClick={handleEndStream}
                  variant="destructive"
                  className="bg-gray-800 hover:bg-gray-700 px-6 py-3"
                >
                  <StopCircle className="h-5 w-5 mr-2" />
                  End Stream
                </Button>
              )}
            </div>

            {isLive ? (
              <LiveStreamBroadcast
                creatorId={user?.id}
                creatorName={user?.name || 'Creator'}
                onEnd={handleEndStream}
              />
            ) : (
              <div className="bg-gray-800/50 rounded-lg p-12 text-center border-2 border-dashed border-gray-700">
                <Radio className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  Ready to Go Live?
                </h3>
                <p className="text-gray-400 mb-6">
                  Start broadcasting to engage with your token holders and grow your community.
                </p>
                <Button
                  onClick={handleGoLive}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Broadcasting
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions & Stats */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button
                onClick={() => router.push(`/token/${symbol}`)}
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
              >
                <Eye className="h-5 w-5 mr-3" />
                View Token Page
              </Button>
              <Button
                onClick={() => router.push('/profile')}
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
              >
                <Settings className="h-5 w-5 mr-3" />
                Profile Settings
              </Button>
            </div>
          </Card>

          {/* Token Performance */}
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
              Token Performance
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Bonding Curve Progress</span>
                  <span className="text-white font-semibold">
                    {token.bondingCurve}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                    style={{ width: `${token.bondingCurve}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Goal: $85K Market Cap for Raydium listing
                </p>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400 text-sm">Price</span>
                  <span className="text-white font-semibold">
                    {token.price.toFixed(8)} SOL
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400 text-sm">24h Change</span>
                  <span
                    className={`font-semibold ${
                      token.priceChange24h >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {token.priceChange24h >= 0 ? '+' : ''}
                    {token.priceChange24h.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Transactions</span>
                  <span className="text-white font-semibold">
                    {token.transactions}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Tips */}
          <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-600/50 p-6">
            <h3 className="text-lg font-bold text-white mb-3">Pro Tips</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span>Stream regularly to build a loyal community</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span>Engage with your chat and respond to questions</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span>Share your stream on social media to grow your audience</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span>Higher market cap = more visibility on the platform</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
