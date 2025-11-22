'use client';
import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function Loading({ size = 'md', text, className = '' }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="relative">
        <Loader2 className={`${sizeClasses[size]} text-purple-500 animate-spin`} />
        <div className="absolute inset-0 animate-ping">
          <Sparkles className={`${sizeClasses[size]} text-purple-400 opacity-30`} />
        </div>
      </div>
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-400 animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
}

export function LoadingCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-800 rounded-lg animate-pulse ${className}`}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 bg-gray-700 rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-24 animate-pulse" />
            <div className="h-3 bg-gray-700 rounded w-16 animate-pulse" />
          </div>
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded w-full animate-pulse" />
          <div className="h-3 bg-gray-700 rounded w-3/4 animate-pulse" />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-gray-700 rounded animate-pulse" />
        
        {/* Buttons */}
        <div className="flex space-x-2">
          <div className="h-10 bg-gray-700 rounded flex-1 animate-pulse" />
          <div className="h-10 w-10 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-4 border-gray-700 border-t-purple-500 ${className}`} />
  );
}