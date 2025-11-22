'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Radio,
  Wallet,
  Trophy,
  Settings,
  Users,
  TrendingUp,
  Play,
  StopCircle,
} from 'lucide-react';
import { LiveStreamBroadcast } from '@/components/streaming/LiveStreamBroadcast';
import { redirect } from 'next/navigation';

export default function ProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [isLive, setIsLive] = useState(false);

  const userId = params.userId as string;
  const isOwnProfile = user?.id === userId;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      redirect('/');
    }
  }, [isAuthenticated]);

  if (!user) {
    return null;
  }

  const initials = user.username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-gray-800 p-8 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24 border-4 border-purple-500">
              <AvatarImage src={user.avatar} alt={user.username} />
              <AvatarFallback className="bg-purple-600 text-white text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{user.username}</h1>
                {user.profile.achievements.length > 0 && (
                  <Badge className="bg-yellow-600 text-white">
                    <Trophy className="h-3 w-3 mr-1" />
                    {user.profile.achievements.length}
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-4 text-gray-400">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{user.profile.followers.length} followers</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>{user.profile.following.length} following</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Wallet className="h-4 w-4" />
                  <span>{user.profile.tokensCreated.length} tokens</span>
                </div>
              </div>

              {user.profile.bio && (
                <p className="mt-3 text-gray-300">{user.profile.bio}</p>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <div className="flex flex-col space-y-2">
              <Button variant="outline" className="border-gray-700 text-gray-300">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>

              {!isLive ? (
                <Button
                  onClick={() => {
                    setActiveTab('broadcast');
                    setIsLive(true);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Radio className="h-4 w-4 mr-2" />
                  Go Live
                </Button>
              ) : (
                <Button
                  onClick={() => setIsLive(false)}
                  variant="destructive"
                  className="bg-gray-800 hover:bg-gray-700"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  End Stream
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-900 border border-gray-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tokens">My Tokens</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="broadcast">Broadcast</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-900 border-gray-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Reputation</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {user.profile.reputation}
                  </p>
                </div>
                <Trophy className="h-12 w-12 text-yellow-500" />
              </div>
            </Card>

            <Card className="bg-gray-900 border-gray-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Tokens Created</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {user.profile.tokensCreated.length}
                  </p>
                </div>
                <Wallet className="h-12 w-12 text-purple-500" />
              </div>
            </Card>

            <Card className="bg-gray-900 border-gray-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Followers</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {user.profile.followers.length}
                  </p>
                </div>
                <Users className="h-12 w-12 text-blue-500" />
              </div>
            </Card>
          </div>

          <Card className="bg-gray-900 border-gray-800 p-6 mt-6">
            <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-400">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <p>Account created on {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              {user.profile.tokensCreated.length > 0 && (
                <div className="flex items-center space-x-3 text-gray-400">
                  <div className="h-2 w-2 bg-purple-500 rounded-full" />
                  <p>Created {user.profile.tokensCreated.length} token(s)</p>
                </div>
              )}
              {user.profile.achievements.length > 0 && (
                <div className="flex items-center space-x-3 text-gray-400">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                  <p>Unlocked {user.profile.achievements.length} achievement(s)</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="mt-6">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-xl font-bold text-white mb-4">My Tokens</h3>
            {user.profile.tokensCreated.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">You haven't created any tokens yet</p>
                <Button
                  onClick={() => (window.location.href = '/create')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create Your First Token
                </Button>
              </div>
            ) : (
              <div className="text-gray-400">
                <p>You have created {user.profile.tokensCreated.length} token(s)</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="mt-6">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Achievements</h3>
            {user.profile.achievements.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No achievements yet. Start creating and trading!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {user.profile.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="text-4xl mb-2">{achievement.icon}</div>
                    <h4 className="font-bold text-white">{achievement.name}</h4>
                    <p className="text-sm text-gray-400">{achievement.description}</p>
                    <Badge className="mt-2 bg-purple-600">{achievement.rarity}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Broadcast Tab (Only for own profile) */}
        {isOwnProfile && (
          <TabsContent value="broadcast" className="mt-6">
            <Card className="bg-gray-900 border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Live Broadcast</h3>
                  <p className="text-gray-400">Share your screen and go live with your community</p>
                </div>
                {isLive && (
                  <Badge className="bg-red-600 text-white animate-pulse">
                    <Radio className="h-3 w-3 mr-1" />
                    LIVE
                  </Badge>
                )}
              </div>

              {isLive ? (
                <LiveStreamBroadcast
                  creatorId={user.id}
                  creatorName={user.username}
                  onEnd={() => setIsLive(false)}
                />
              ) : (
                <div className="text-center py-12">
                  <Radio className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Ready to go live?</p>
                  <Button
                    onClick={() => setIsLive(true)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Broadcasting
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
