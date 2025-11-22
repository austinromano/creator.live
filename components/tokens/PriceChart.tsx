'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { PricePoint } from '@/lib/types';
import { CHART_CONFIG } from '@/lib/constants';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceChartProps {
  priceHistory: PricePoint[];
  currentPrice: number;
  priceChange24h: number;
  symbol: string;
  className?: string;
}

export function PriceChart({ 
  priceHistory, 
  currentPrice, 
  priceChange24h, 
  symbol,
  className = '' 
}: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1d');

  const chartData = useMemo(() => {
    return priceHistory.map(point => ({
      timestamp: point.timestamp,
      price: point.price,
      volume: point.volume,
      time: new Date(point.timestamp).toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      date: new Date(point.timestamp).toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric'
      }),
    }));
  }, [priceHistory]);

  const isPositive = priceChange24h > 0;
  const minPrice = Math.min(...priceHistory.map(p => p.price));
  const maxPrice = Math.max(...priceHistory.map(p => p.price));
  const priceRange = maxPrice - minPrice;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-400 text-sm">
            {data.date} at {data.time}
          </p>
          <p className="text-white font-semibold">
            Price: ${data.price.toFixed(6)}
          </p>
          <p className="text-blue-400 text-sm">
            Volume: ${data.volume.toFixed(0)}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatYAxisPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  return (
    <Card className={`${className} bg-gray-900 border-gray-700`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <span>${symbol} Price Chart</span>
            <Badge variant={isPositive ? "default" : "destructive"} className={
              isPositive ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }>
              <div className="flex items-center space-x-1">
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{isPositive ? '+' : ''}{priceChange24h.toFixed(1)}%</span>
              </div>
            </Badge>
          </CardTitle>
          
          <div className="flex space-x-1">
            {CHART_CONFIG.timeframes.map(({ label, value }) => (
              <Button
                key={value}
                variant={selectedTimeframe === value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeframe(value)}
                className={
                  selectedTimeframe === value
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "border-gray-600 text-gray-300 hover:border-purple-500 hover:text-white"
                }
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex items-baseline space-x-4">
          <h3 className="text-2xl font-bold text-white">
            ${currentPrice.toFixed(6)}
          </h3>
          <div className={`flex items-center space-x-1 ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span className="font-semibold">
              {isPositive ? '+' : ''}${Math.abs(priceChange24h * currentPrice / 100).toFixed(6)} 
              ({isPositive ? '+' : ''}{priceChange24h.toFixed(1)}%)
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={isPositive ? CHART_CONFIG.colors.positive : CHART_CONFIG.colors.negative} 
                    stopOpacity={0.3}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={isPositive ? CHART_CONFIG.colors.positive : CHART_CONFIG.colors.negative} 
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#374151"
                opacity={0.3}
              />
              
              <XAxis 
                dataKey="time"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxisPrice}
                domain={[
                  (dataMin: number) => dataMin * 0.999,
                  (dataMax: number) => dataMax * 1.001
                ]}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? CHART_CONFIG.colors.positive : CHART_CONFIG.colors.negative}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#priceGradient)"
                activeDot={{
                  r: 4,
                  fill: isPositive ? CHART_CONFIG.colors.positive : CHART_CONFIG.colors.negative,
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Price Statistics */}
        <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-gray-800/50 rounded-lg">
          <div className="text-center">
            <p className="text-gray-400 text-sm">24h High</p>
            <p className="text-white font-semibold">${maxPrice.toFixed(6)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">24h Low</p>
            <p className="text-white font-semibold">${minPrice.toFixed(6)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">24h Range</p>
            <p className="text-white font-semibold">${priceRange.toFixed(6)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}