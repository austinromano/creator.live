'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useWallet } from '@/hooks/useWallet';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Copy, ExternalLink, LogOut } from 'lucide-react';

export function WalletConnect() {
  const { isConnected, address, balance, disconnect, formatAddress, formatBalance } = useWallet();
  const [showDetails, setShowDetails] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      // You could add a toast notification here
    }
  };

  if (!mounted) {
    return (
      <Button 
        variant="outline" 
        className="border-purple-500 text-purple-300 hover:bg-purple-500/10"
        disabled
      >
        <Wallet className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (isConnected) {
    return (
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="border-purple-500 text-purple-300 hover:bg-purple-500/10"
          >
            <Wallet className="h-4 w-4 mr-2" />
            {formatAddress()}
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Wallet Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Manage your wallet connection and view balance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm text-gray-400">Balance</p>
                <p className="text-xl font-bold text-white">{formatBalance()}</p>
              </div>
              <Wallet className="h-8 w-8 text-purple-500" />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-gray-400">Address</p>
                <p className="text-sm font-mono text-white break-all">{address}</p>
              </div>
              <div className="flex space-x-2 ml-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyAddress}
                  className="text-gray-400 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="text-gray-400 hover:text-white"
                >
                  <a 
                    href={`https://solscan.io/account/${address}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <Button 
              onClick={disconnect}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="wallet-adapter-button-trigger">
      {mounted && (
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !text-white !font-semibold !rounded-md !h-10" />
      )}
    </div>
  );
}