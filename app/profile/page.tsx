'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTokenStore } from '@/stores/tokenStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Trophy,
  Users,
  TrendingUp,
  Settings,
  Mail,
  Calendar,
  Radio,
  StopCircle,
  DollarSign,
  BarChart3,
  Eye,
  Play,
  Loader2,
} from 'lucide-react';
import { LiveStreamBroadcast } from '@/components/streaming/LiveStreamBroadcast';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { getTokenByCreator, updateToken } = useTokenStore();
  const [isLive, setIsLive] = useState(false);

  const user = session?.user as any;
  const userId = user?.id;
  const username = user?.name || 'User';

  // Check if user has a token
  const userToken = userId ? getTokenByCreator(userId) : null;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (userToken) {
      setIsLive(userToken.isLive || false);
    }
  }, [userToken]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const initials = username
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleGoLive = () => {
    if (userToken) {
      setIsLive(true);
      updateToken(userToken.symbol, { isLive: true });
    }
  };

  const handleEndStream = () => {
    if (userToken) {
      setIsLive(false);
      updateToken(userToken.symbol, { isLive: false });
    }
  };

  // If user has a token, show the broadcast dashboard
  if (userToken) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* User Profile Header */}
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20 border-4 border-purple-500">
                <AvatarImage src={user.image || userToken.avatar} />
                <AvatarFallback className="bg-purple-600 text-white text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{username}</h1>
                  <Badge className="bg-green-600 text-white">Active</Badge>
                </div>
                <div className="flex flex-col space-y-1 text-sm text-gray-400">
                  {user.walletAddress && (
                    <div className="flex items-center space-x-2">
                      <Wallet className="h-4 w-4" />
                      <span className="font-mono">
                        {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}
                      </span>
                    </div>
                  )}
                  {user.email && !user.walletAddress && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  {user.provider && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        Connected via {user.provider === 'phantom' ? 'Phantom Wallet' : user.provider === 'google' ? 'Google' : 'Email'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {isLive && (
              <Badge className="bg-red-600 text-white px-4 py-2 text-lg animate-pulse">
                <Radio className="h-5 w-5 mr-2" />
                LIVE
              </Badge>
            )}
          </div>
        </div>

        {/* User Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Reputation</p>
                <p className="text-3xl font-bold text-white mt-1">0</p>
              </div>
              <Trophy className="h-12 w-12 text-yellow-500" />
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">SOL Received</p>
                <p className="text-3xl font-bold text-white mt-1">0.00</p>
                <p className="text-xs text-gray-500 mt-1">SOL</p>
              </div>
              <Wallet className="h-12 w-12 text-purple-500" />
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Followers</p>
                <p className="text-3xl font-bold text-white mt-1">0</p>
              </div>
              <Users className="h-12 w-12 text-blue-500" />
            </div>
          </Card>
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

          {/* Token Stats & Performance */}
          <div className="space-y-6">
            {/* Token Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gray-900 border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Market Cap</p>
                    <p className="text-xl font-bold text-white">
                      ${userToken.marketCap.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </Card>

              <Card className="bg-gray-900 border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Holders</p>
                    <p className="text-xl font-bold text-white">{userToken.holders}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </Card>

              <Card className="bg-gray-900 border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">24h Volume</p>
                    <p className="text-xl font-bold text-white">
                      {userToken.volume24h.toFixed(2)} SOL
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </Card>

              <Card className="bg-gray-900 border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Current Viewers</p>
                    <p className="text-xl font-bold text-white">
                      {userToken.viewers || 0}
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-yellow-500" />
                </div>
              </Card>
            </div>

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
                      {userToken.bondingCurve}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                      style={{ width: `${userToken.bondingCurve}%` }}
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
                      {userToken.price.toFixed(8)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400 text-sm">24h Change</span>
                    <span
                      className={`font-semibold ${
                        userToken.priceChange24h >= 0
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {userToken.priceChange24h >= 0 ? '+' : ''}
                      {userToken.priceChange24h.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Transactions</span>
                    <span className="text-white font-semibold">
                      {userToken.transactions}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Pro Tips */}
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

  // If user doesn't have a token, show the regular profile page

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-gray-800 p-8 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24 border-4 border-purple-500">
              <AvatarImage src={user.image} alt={username} />
              <AvatarFallback className="bg-purple-600 text-white text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{username}</h1>
                <Badge className="bg-green-600 text-white">
                  Active
                </Badge>
              </div>

              <div className="flex flex-col space-y-2 text-gray-400">
                {user.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                )}
                {user.walletAddress && (
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4" />
                    <span className="text-sm font-mono">
                      {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}
                    </span>
                  </div>
                )}
                {user.provider && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      Connected via {user.provider === 'phantom' ? 'Phantom Wallet' : user.provider === 'google' ? 'Google' : 'Email'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => router.push('/create')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Create Token
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Reputation</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
            </div>
            <Trophy className="h-12 w-12 text-yellow-500" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">SOL Received</p>
              <p className="text-3xl font-bold text-white mt-1">0.00</p>
              <p className="text-xs text-gray-500 mt-1">SOL</p>
            </div>
            <Wallet className="h-12 w-12 text-purple-500" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Followers</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
            </div>
            <Users className="h-12 w-12 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Activity Section */}
      <Card className="bg-gray-900 border-gray-800 p-6 mb-6">
        <h3 className="text-xl font-bold text-white mb-4">Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-gray-400">
            <div className="h-2 w-2 bg-green-500 rounded-full" />
            <p>Welcome to creator.fun! Your profile has been created.</p>
          </div>
          <div className="text-center py-8 border-t border-gray-800 mt-4">
            <TrendingUp className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Start your creator journey!</p>
            <p className="text-sm text-gray-500 mb-4">
              Create your first token, build your community, and unlock achievements.
            </p>
            <Button
              onClick={() => router.push('/create')}
              className="bg-green-600 hover:bg-green-700"
            >
              Create Your First Token
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
            onClick={() => router.push('/create')}
          >
            <Wallet className="h-5 w-5 mr-3 text-purple-500" />
            Create a Token
          </Button>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
            onClick={() => router.push('/')}
          >
            <TrendingUp className="h-5 w-5 mr-3 text-blue-500" />
            Explore Trending
          </Button>
        </div>
      </Card>
    </div>
  );
}
