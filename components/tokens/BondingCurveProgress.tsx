'use client';
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Zap } from 'lucide-react';

interface BondingCurveProgressProps {
  progress: number;
  marketCap: number;
  targetMarketCap?: number;
  className?: string;
}

export function BondingCurveProgress({ 
  progress, 
  marketCap, 
  targetMarketCap = 85000,
  className = '' 
}: BondingCurveProgressProps) {
  const isNearCompletion = progress >= 85;
  const isCompleted = progress >= 100;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-purple-400" />
          <span className="text-white font-semibold">Bonding Curve</span>
        </div>
        <div className="flex items-center space-x-2">
          {isCompleted && (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              <Zap className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
          {isNearCompletion && !isCompleted && (
            <Badge variant="default" className="bg-yellow-600 hover:bg-yellow-700">
              <Target className="h-3 w-3 mr-1" />
              Near Complete
            </Badge>
          )}
          <span className="text-purple-400 font-bold">{progress.toFixed(1)}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <Progress 
          value={Math.min(progress, 100)} 
          className="h-3 bg-gray-700"
        />
        {/* Milestone markers */}
        <div className="absolute top-0 left-0 w-full h-3 flex items-center">
          {[25, 50, 75, 85].map((milestone) => (
            <div
              key={milestone}
              className="absolute w-0.5 h-full bg-gray-600"
              style={{ left: `${milestone}%` }}
            />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between items-center text-sm">
        <div>
          <span className="text-gray-400">Current: </span>
          <span className="text-white font-semibold">${formatNumber(marketCap)}</span>
        </div>
        <div>
          <span className="text-gray-400">Target: </span>
          <span className="text-green-400 font-semibold">${formatNumber(targetMarketCap)}</span>
        </div>
      </div>

      {/* Description */}
      <div className="text-xs text-gray-500 p-3 bg-gray-800/50 rounded">
        {isCompleted ? (
          <p>🎉 Bonding curve completed! All liquidity has been deposited to Raydium and burned.</p>
        ) : isNearCompletion ? (
          <p>🚀 Almost there! When this reaches 100%, all liquidity will be deposited to Raydium.</p>
        ) : (
          <p>When the bonding curve completes, all the liquidity will be deposited to Raydium and the LP tokens burned.</p>
        )}
      </div>
    </div>
  );
}