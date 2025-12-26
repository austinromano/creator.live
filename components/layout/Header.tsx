'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserMenu } from './UserMenu';
import { Sparkles, LogIn, Star, Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSession } from 'next-auth/react';
import { authGet } from '@/lib/fetch';

interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  isVerified: boolean;
  isOnline: boolean;
  isLive: boolean;
}

export function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { setShowAuthModal } = useAuthStore();
  const isAuthenticated = !!session?.user;
  const [unreadCount, setUnreadCount] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);

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

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!isAuthenticated) {
        setFriends([]);
        return;
      }
      try {
        const response = await authGet('/api/user/friends');
        if (response.ok) {
          const data = await response.json();
          setFriends(data.friends || []);
        }
      } catch {
        // Silently ignore fetch errors
      }
    };

    fetchFriends();
    // Refresh friends list every minute
    const friendsInterval = setInterval(fetchFriends, 60000);

    return () => clearInterval(friendsInterval);
  }, [isAuthenticated]);

  // Show header on all devices - fixed position with enhanced frosted glass effect
  const headerClassName = "fixed top-0 z-[60] w-full bg-black/30 backdrop-blur-xl";

  // Hide header on profile and live pages
  if (pathname.startsWith('/profile/') || pathname.startsWith('/live/') || pathname === '/live') {
    return null;
  }

  return (
    <header className={headerClassName}>
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Left Side - Login/User + Following Icons */}
          <div className="flex items-center gap-1">
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

            {/* Following/Friends Icons */}
            {isAuthenticated && friends.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto max-w-xl scrollbar-hide">
                {friends.slice(0, 10).map((friend) => (
                  <Link
                    key={friend.id}
                    href={`/profile/${friend.username}`}
                    className="relative flex-shrink-0"
                    title={friend.displayName}
                  >
                    <div className="relative">
                      {friend.avatar ? (
                        <Image
                          src={friend.avatar}
                          alt={friend.displayName}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-purple-600/80 hover:opacity-90 transition-opacity flex items-center justify-center text-sm font-bold">
                          {friend.displayName[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      {friend.isLive && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full ring-1 ring-black" />
                      )}
                      {!friend.isLive && friend.isOnline && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-1 ring-black" />
                      )}
                      {!friend.isLive && !friend.isOnline && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-gray-400 rounded-full ring-1 ring-black" />
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center space-x-2">
          </div>
        </div>
      </div>
    </header>
  );
}
