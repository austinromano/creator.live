'use client';
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WalletConnect } from './WalletConnect';
import { MobileNav } from './MobileNav';
import { NetworkIndicator } from './NetworkIndicator';
import { Sparkles, TrendingUp, Radio, Rocket } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile Navigation */}
          <div className="md:hidden">
            <MobileNav />
          </div>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              creator.fun
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/?filter=live" 
              className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
            >
              <Radio className="h-4 w-4 text-red-500" />
              <span>Live Now</span>
            </Link>
            <Link 
              href="/?filter=new" 
              className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
            >
              <Rocket className="h-4 w-4 text-blue-500" />
              <span>New Tokens</span>
            </Link>
            <Link 
              href="/?filter=trending" 
              className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
            >
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Trending</span>
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2 md:space-x-3">
            <NetworkIndicator />
            <Link href="/create" className="hidden sm:block">
              <Button 
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white px-3 md:px-6 py-2 font-semibold text-sm md:text-base"
              >
                <span className="hidden md:inline">Create Token</span>
                <span className="md:hidden">Create</span>
              </Button>
            </Link>
            <div className="hidden md:block">
              <WalletConnect />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}