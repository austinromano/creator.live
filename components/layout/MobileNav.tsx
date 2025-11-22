'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { WalletConnect } from './WalletConnect';
import { 
  Menu, 
  X,
  Radio, 
  Rocket, 
  TrendingUp,
  Sparkles,
  Home,
  Plus
} from 'lucide-react';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { href: '/?filter=live', label: 'Live Now', icon: <Radio className="h-5 w-5 text-red-500" /> },
    { href: '/?filter=new', label: 'New Tokens', icon: <Rocket className="h-5 w-5 text-blue-500" /> },
    { href: '/?filter=trending', label: 'Trending', icon: <TrendingUp className="h-5 w-5 text-green-500" /> },
    { href: '/create', label: 'Create Token', icon: <Plus className="h-5 w-5 text-green-500" /> },
  ];

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white hover:bg-gray-800"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-gray-900 border-gray-700 text-white w-full max-w-sm h-full max-h-screen p-0 m-0 rounded-none">
        <DialogHeader className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                creator.fun
              </span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* Navigation Links */}
          <nav className="flex-1 px-6 py-4 space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={handleLinkClick}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left h-12 px-3 text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
          
          {/* Wallet Connection */}
          <div className="px-6 pb-6 border-t border-gray-700 pt-4">
            <div className="w-full">
              <WalletConnect />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}