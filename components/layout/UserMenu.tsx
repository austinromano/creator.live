'use client';
import React from 'react';
import Link from 'next/link';
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
import { User, Settings, LogOut, Radio, Trophy, Wallet } from 'lucide-react';

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const user = session.user as any;
  const username = user.name || 'User';
  const userId = user.id || user.email;

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
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <Avatar className="h-8 w-8 border-2 border-purple-500">
            <AvatarImage src={user.image} alt={username} />
            <AvatarFallback className="bg-purple-600 text-white text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-medium text-white">
            {username}
          </span>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56 bg-gray-900 border-gray-800">
        <DropdownMenuLabel className="text-gray-400">My Account</DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-gray-800" />

        <Link href="/profile">
          <DropdownMenuItem className="cursor-pointer text-gray-300 hover:text-white hover:bg-gray-800">
            <User className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/create">
          <DropdownMenuItem className="cursor-pointer text-gray-300 hover:text-white hover:bg-gray-800">
            <Wallet className="mr-2 h-4 w-4" />
            <span>Create Token</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator className="bg-gray-800" />

        <Link href="/settings">
          <DropdownMenuItem className="cursor-pointer text-gray-300 hover:text-white hover:bg-gray-800">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator className="bg-gray-800" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-gray-800"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>

        {user.provider && (
          <>
            <DropdownMenuSeparator className="bg-gray-800" />
            <div className="px-2 py-1.5 text-xs text-gray-500">
              Connected via {user.provider === 'phantom' ? 'Phantom' : 'Google'}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
