'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserMenu } from './UserMenu';
import { Sparkles, LogIn, Star, Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSession } from 'next-auth/react';
import { authGet } from '@/lib/fetch';

export function Header() {
  const { data: session, status } = useSession();
  const { setShowAuthModal } = useAuthStore();
  const isAuthenticated = !!session?.user;
  const [unreadCount, setUnreadCount] = useState(0);

  // Use refs to prevent duplicate intervals and track component mount
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchNotifications = async () => {
      if (!isMountedRef.current) return;
      try {
        const response = await authGet('/api/notifications?unread=true');
        if (response.ok && isMountedRef.current) {
          const data = await response.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // Silently ignore fetch errors
      }
    };

    const startPolling = () => {
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(fetchNotifications, 30000);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (isAuthenticated) {
        fetchNotifications();
        startPolling();
      }
    };

    // Only start polling if authenticated and visible
    if (isAuthenticated && status === 'authenticated') {
      fetchNotifications();
      if (!document.hidden) {
        startPolling();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, status]);

  // Hide header on mobile, show only on desktop (lg screens and up)
  const headerClassName = "sticky top-0 z-50 w-full bg-transparent hidden lg:block";

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
            <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
            <span
              className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent font-[family-name:var(--font-pacifico)]"
            >
              Osho
            </span>
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
