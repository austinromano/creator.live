'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Radio, Camera, Compass, User } from 'lucide-react';

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
    { href: '/live', icon: Radio, label: 'Live' },
    { href: '/golive', icon: Camera, label: 'Create', isCenter: true },
    { href: '/explore', icon: Compass, label: 'Explore' },
    { href: profileHref, icon: User, label: 'Profile' },
  ];

  // Hide navbar on camera and golive pages (must be after all hooks)
  if (pathname === '/camera' || pathname === '/golive') {
    return null;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/10 backdrop-blur-[4px] border-t border-white/5 z-50 pb-[env(safe-area-inset-bottom,24px)]">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center pt-2"
              >
                <div className="relative">
                  {/* Breathing glow effect */}
                  <div className="absolute -inset-1 bg-purple-500 rounded-xl blur-md animate-[pulse_2s_ease-in-out_infinite] opacity-70" />
                  <div className="absolute -inset-0.5 bg-purple-400 rounded-xl blur-sm animate-[pulse_2s_ease-in-out_infinite_0.5s] opacity-50" />
                  <div className="relative w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center pt-2"
            >
              <Icon className={`h-6 w-6 ${isActive ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-white/80'}`} />
              <span className={`text-[10px] mt-1 ${isActive ? 'text-purple-400' : 'text-white/60'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
