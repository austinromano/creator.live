'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Radio, Camera, MessageCircle, User } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [username, setUsername] = useState<string | null>(null);
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
    const fetchUsername = async () => {
      if (!session?.user) return;
      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.username) {
            setUsername(data.user.username);
          }
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      }
    };
    fetchUsername();
    fetchNotifications();

    // Poll for notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [session, fetchNotifications]);

  const user = session?.user as any;
  const profileHref = username || user?.name ? `/profile/${username || user?.name}` : '/profile';

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/explore', icon: Radio, label: 'Live' },
    { href: '/golive', icon: Camera, label: 'Go Live', isCenter: true },
    { href: '/messages', icon: MessageCircle, label: 'Messages', badge: unreadCount },
    { href: profileHref, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50 pb-safe">
      <div className="flex items-end justify-around h-16 pb-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-4"
              >
                <div className="relative">
                  {/* Breathing glow effect */}
                  <div className="absolute inset-0 w-12 h-12 bg-purple-300 rounded-full blur-md animate-[pulse_4s_ease-in-out_infinite] opacity-90" />
                  <div className="relative w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/70">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center relative w-16"
            >
              <div className="relative inline-flex">
                <Icon className={`h-6 w-6 ${isActive ? 'text-purple-500' : 'text-gray-400'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 min-w-[18px] h-[18px] bg-[#ff3b30] rounded-full flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white leading-none px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 ${isActive ? 'text-purple-500' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
