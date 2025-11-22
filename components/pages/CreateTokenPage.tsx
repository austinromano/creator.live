'use client';
import React from 'react';
import { CreateTokenForm } from '@/components/create/CreateTokenForm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Rocket, 
  TrendingUp, 
  Users, 
  DollarSign,
  Shield,
  Zap
} from 'lucide-react';

export function CreateTokenPage() {
  const features = [
    {
      icon: <Rocket className="h-6 w-6" />,
      title: "Instant Launch",
      description: "Deploy your creator token in seconds with our bonding curve technology"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Price Discovery",
      description: "Let the market determine your token's value through automated price curves"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Community Building", 
      description: "Create a loyal fanbase that can directly invest in your success"
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: "Monetize Content",
      description: "Earn from your content through token appreciation and live streaming"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Fair Launch",
      description: "No pre-sales or insider allocations - everyone gets the same opportunity"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Auto Liquidity",
      description: "Automatic Raydium listing when bonding curve completes"
    }
  ];

  const stats = [
    { value: "500+", label: "Tokens Created" },
    { value: "$2.5M", label: "Total Volume" },
    { value: "50K", label: "Active Holders" },
    { value: "98%", label: "Success Rate" }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center space-y-6 mb-12">
        <div className="flex items-center justify-center space-x-2">
          <Sparkles className="h-8 w-8 text-purple-500" />
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500 bg-clip-text text-transparent">
            Launch Your Token
          </h1>
        </div>
        
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Create your own creator token in minutes. Build a community, monetize your content, 
          and let your fans invest in your success through bonding curve technology.
        </p>

        <div className="flex flex-wrap justify-center gap-6 mt-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Create Token Form */}
        <div className="order-2 lg:order-1">
          <CreateTokenForm />
        </div>

        {/* Features */}
        <div className="order-1 lg:order-2 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              <span>Why Create a Token?</span>
            </h2>
            
            <div className="space-y-4">
              {features.map((feature, index) => (
                <Card key={index} className="bg-gray-900/50 border-gray-700 hover:border-purple-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-purple-500 mt-1">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                        <p className="text-gray-400 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <Badge className="bg-purple-600 hover:bg-purple-700 min-w-fit">1</Badge>
                <div>
                  <h3 className="font-semibold text-white">Create Your Token</h3>
                  <p className="text-gray-400 text-sm">Fill in your token details, upload an image, and deploy for just 0.02 SOL</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <Badge className="bg-purple-600 hover:bg-purple-700 min-w-fit">2</Badge>
                <div>
                  <h3 className="font-semibold text-white">Build Community</h3>
                  <p className="text-gray-400 text-sm">Share your token, stream content, and engage with your community</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <Badge className="bg-purple-600 hover:bg-purple-700 min-w-fit">3</Badge>
                <div>
                  <h3 className="font-semibold text-white">Reach $85K Market Cap</h3>
                  <p className="text-gray-400 text-sm">When your token reaches $85K, all liquidity migrates to Raydium automatically</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}