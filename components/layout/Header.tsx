'use client';
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WalletConnect } from './WalletConnect';
import { MobileNav } from './MobileNav';
import { NetworkIndicator } from './NetworkIndicator';
import { UserMenu } from './UserMenu';
import { Sparkles, TrendingUp, Radio, Rocket, LogIn } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSession } from 'next-auth/react';

export function Header() {
  const { data: session } = useSession();
  const { setShowAuthModal } = useAuthStore();
  const isAuthenticated = !!session?.user;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side - Login/User + Mobile Nav */}
          <div className="flex items-center space-x-3">
            {/* Login Button or User Menu */}
            {!isAuthenticated ? (
              <Button
                onClick={() => setShowAuthModal(true)}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-gray-800"
              >
                <LogIn className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            ) : (
              <UserMenu />
            )}

            {/* Mobile Navigation */}
            <div className="md:hidden">
              <MobileNav />
            </div>
          </div>

          {/* Center - Logo */}
          <Link href="/" className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
            <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              creator.fun
            </span>
          </Link>

          {/* Right Side - Actions */}
          <div className="flex items-center space-x-2 md:space-x-3">
            <Button
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                } else {
                  window.location.href = '/create';
                }
              }}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white px-3 md:px-6 py-2 font-semibold text-sm md:text-base"
            >
              <span className="hidden md:inline">Create Token</span>
              <span className="md:hidden">Create</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}