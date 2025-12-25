'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, Radio } from 'lucide-react';

export function UserMenu() {
  const { data: session } = useSession();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Fetch user data from database to get the latest avatar
  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user) return;

      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.avatar) {
            setUserAvatar(data.user.avatar);
          }
          if (data.user?.username) {
            setUserName(data.user.username);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [session]);

  if (!session?.user) return null;

  const user = session.user as any;
  const username = userName || user.name || 'User';
  const userId = user.id || user.email;
  const avatarSrc = userAvatar || user.image;

  const initials = username
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <Link href="/">
      <div className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
        <Image
          src="/osho-icon.png"
          alt="OSHO"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <span className="hidden md:block text-sm font-medium text-white">
          {username}
        </span>
      </div>
    </Link>
  );
}
