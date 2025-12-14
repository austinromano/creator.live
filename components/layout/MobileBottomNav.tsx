'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Radio, Camera, User } from 'lucide-react';

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
    { href: '/explore', icon: Radio, label: 'Live' },
    { href: '/golive', icon: Camera, label: 'Create', isCenter: true },
    { href: profileHref, icon: User, label: 'Profile' },
  ];

  // Hide navbar on camera and golive pages (must be after all hooks)
  if (pathname === '/camera' || pathname === '/golive') {
    return null;
  }

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
