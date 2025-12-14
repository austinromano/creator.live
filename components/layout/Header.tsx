'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserMenu } from './UserMenu';
import { Sparkles, LogIn, Star, Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSession } from 'next-auth/react';

export function Header() {
  const { data: session } = useSession();
  const { setShowAuthModal } = useAuthStore();
  const isAuthenticated = !!session?.user;
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    try {
      const response = await fetch('/api/notifications?unread=true');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [session]);

  useEffect(() => {
    fetchNotifications();
    // Poll for notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Hide header on mobile when authenticated (only show on lg screens and up)
  const headerClassName = isAuthenticated
    ? "sticky top-0 z-50 w-full bg-transparent hidden lg:block"
    : "sticky top-0 z-50 w-full bg-transparent";

  return (
    <header className={headerClassName}>
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
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

          </div>

          {/* Center - Logo */}
          <Link href="/" className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
            <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-purple-500 animate-pulse" />
            <span
              className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent"
              style={{
                animation: 'breathe 3s ease-in-out infinite',
              }}
            >
              OSHO
            </span>
            <style jsx>{`
              @keyframes breathe {
                0%, 100% {
                  filter: none;
                }
                50% {
                  filter: drop-shadow(0 0 10px #a855f7) drop-shadow(0 0 20px #a855f7) drop-shadow(0 0 40px #9333ea);
                }
              }
            `}</style>
          </Link>

          {/* Right Side - Actions */}
          <div className="flex items-center space-x-2">
            {/* Star Icon */}
            <Button
              variant="ghost"
              size="sm"
              className="bg-gray-800 hover:bg-gray-700 text-white p-2.5 rounded-full"
            >
              <Star className="h-5 w-5" />
            </Button>

            {/* Bell Icon with notification badge */}
            <Link href="/messages" className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="bg-gray-800 hover:bg-gray-700 text-white p-2.5 rounded-full"
              >
                <Bell className="h-5 w-5" />
              </Button>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 min-w-[18px] h-[18px] bg-[#ff3b30] rounded-full flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white leading-none px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
