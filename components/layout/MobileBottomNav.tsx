'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Search, Plus, MessageCircle, User } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [username, setUsername] = useState<string | null>(null);

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
  }, [session]);

  const user = session?.user as any;
  const profileHref = username || user?.name ? `/profile/${username || user?.name}` : '/profile';

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/explore', icon: Search, label: 'Explore' },
    { href: '/golive', icon: Plus, label: 'Go Live', isCenter: true },
    { href: '/messages', icon: MessageCircle, label: 'Messages' },
    { href: profileHref, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="relative">
                  {/* Breathing glow effect */}
                  <div className="absolute inset-0 w-12 h-12 bg-purple-500 rounded-full blur-sm animate-[pulse_1.5s_ease-in-out_infinite] opacity-40" />
                  <div className="relative w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 mt-1">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-2"
            >
              <Icon className={`h-6 w-6 ${isActive ? 'text-purple-500' : 'text-gray-400'}`} />
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
