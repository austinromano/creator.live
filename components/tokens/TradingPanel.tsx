'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTradingStore } from '@/stores/tradingStore';
import { useWallet } from '@/hooks/useWallet';
import { Creator } from '@/lib/types';
import { TRADING_CONFIG } from '@/lib/constants';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Activity, 
  Settings,
  AlertCircle,
  Wallet
} from 'lucide-react';

interface TradingPanelProps {
  creator: Creator;
  className?: string;
}

export function TradingPanel({ creator, className = '' }: TradingPanelProps) {
  const { tradeType, amount, slippage, setTradeType, setAmount, setSlippage, executeTrade } = useTradingStore();
  const { isConnected, balance, connect } = useWallet();
  const [isTrading, setIsTrading] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);

  // Calculate estimated tokens and price impact
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setEstimatedTokens(0);
      setPriceImpact(0);
      return;
    }

    const amountNum = parseFloat(amount);
    const currentPrice = creator.price;
    
    // Simple calculation - in real app this would use bonding curve math
    const baseTokens = amountNum / currentPrice;
    const impact = Math.min((amountNum / creator.liquidity) * 100, 50);
    const adjustedPrice = currentPrice * (1 + (tradeType === 'buy' ? impact : -impact) / 100);
    const tokens = amountNum / adjustedPrice;
    
    setEstimatedTokens(tradeType === 'buy' ? tokens : tokens * currentPrice);
    setPriceImpact(impact);
  }, [amount, creator.price, creator.liquidity, tradeType]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleTrade = async () => {
    if (!isConnected) {
      connect();
      return;
    }

    if (!amount || parseFloat(amount) <= 0) return;

    setIsTrading(true);
    try {
      await executeTrade();
      // Success feedback would be shown here
    } catch (error) {
      console.error('Trade failed:', error);
      // Error feedback would be shown here
    } finally {
      setIsTrading(false);
    }
  };

  const canTrade = isConnected && amount && parseFloat(amount) > 0 && parseFloat(amount) <= balance;
  const hasHighSlippage = slippage > 5;
  const hasHighPriceImpact = priceImpact > 10;

  return (
    <Card className={`${className} bg-gray-900 border-gray-700`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-white">Trade ${creator.symbol}</span>
          <Badge variant={creator.isLive ? "destructive" : "secondary"}>
            {creator.isLive ? "LIVE" : "OFFLINE"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Token Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-400">Price</span>
            </div>
            <p className="text-lg font-bold text-white">${creator.price.toFixed(6)}</p>
            <div className={`flex items-center space-x-1 text-xs ${
              creator.priceChange24h > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {creator.priceChange24h > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{creator.priceChange24h > 0 ? '+' : ''}{creator.priceChange24h.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Market Cap</span>
            </div>
            <p className="text-lg font-bold text-white">${formatNumber(creator.marketCap)}</p>
            <p className="text-xs text-gray-500">{formatNumber(creator.holders)} holders</p>
          </div>
        </div>

        {/* Trading Tabs */}
        <Tabs value={tradeType} onValueChange={(value) => setTradeType(value as 'buy' | 'sell')}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger 
              value="buy" 
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Buy
            </TabsTrigger>
            <TabsTrigger 
              value="sell"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Sell
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buy-amount" className="text-white">
                You pay (SOL)
              </Label>
              <Input
                id="buy-amount"
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                min="0"
                step="0.001"
              />
              <div className="flex space-x-2">
                {TRADING_CONFIG.quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(quickAmount)}
                    className="border-gray-600 text-gray-300 hover:border-green-500 hover:text-white"
                  >
                    {quickAmount}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-400">You receive</Label>
              <div className="p-3 bg-gray-800 rounded text-white">
                {estimatedTokens > 0 ? (
                  <>
                    {formatNumber(estimatedTokens)} {creator.symbol}
                  </>
                ) : (
                  'Enter amount'
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sell-amount" className="text-white">
                You sell ({creator.symbol})
              </Label>
              <Input
                id="sell-amount"
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                min="0"
                step="1"
              />
              <p className="text-xs text-gray-500">
                Balance: {formatNumber(50000)} {creator.symbol} {/* Mock balance */}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-400">You receive</Label>
              <div className="p-3 bg-gray-800 rounded text-white">
                {estimatedTokens > 0 ? (
                  <>
                    {estimatedTokens.toFixed(4)} SOL
                  </>
                ) : (
                  'Enter amount'
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Slippage Settings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-gray-400 flex items-center space-x-1">
              <Settings className="h-4 w-4" />
              <span>Slippage tolerance</span>
            </Label>
            <span className={`text-sm ${hasHighSlippage ? 'text-yellow-400' : 'text-white'}`}>
              {slippage}%
            </span>
          </div>
          <Input
            type="range"
            min="0.1"
            max="50"
            step="0.1"
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value))}
            className="bg-gray-800"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.1%</span>
            <span>50%</span>
          </div>
        </div>

        {/* Trade Info */}
        {amount && parseFloat(amount) > 0 && (
          <div className="space-y-2 p-3 bg-gray-800/50 rounded">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Price impact</span>
              <span className={hasHighPriceImpact ? 'text-red-400' : 'text-gray-300'}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Min. received</span>
              <span className="text-gray-300">
                {tradeType === 'buy' ? 
                  `${formatNumber(estimatedTokens * (1 - slippage/100))} ${creator.symbol}` :
                  `${(estimatedTokens * (1 - slippage/100)).toFixed(4)} SOL`
                }
              </span>
            </div>
          </div>
        )}

        {/* Warnings */}
        {(hasHighSlippage || hasHighPriceImpact) && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-600/20 border border-yellow-600/50 rounded">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm">
              {hasHighPriceImpact ? 'High price impact!' : 'High slippage tolerance!'}
            </span>
          </div>
        )}

        {/* Trade Button */}
        <Button
          onClick={handleTrade}
          disabled={!canTrade || isTrading}
          className={`w-full py-6 text-lg font-semibold ${
            tradeType === 'buy' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {!isConnected ? (
            <>
              <Wallet className="h-5 w-5 mr-2" />
              Connect Wallet
            </>
          ) : isTrading ? (
            <>
              <Activity className="h-5 w-5 mr-2 animate-spin" />
              {tradeType === 'buy' ? 'Buying...' : 'Selling...'}
            </>
          ) : (
            `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${creator.symbol}`
          )}
        </Button>

        {/* Balance */}
        {isConnected && (
          <p className="text-center text-sm text-gray-400">
            Balance: {balance.toFixed(4)} SOL
          </p>
        )}
      </CardContent>
    </Card>
  );
}