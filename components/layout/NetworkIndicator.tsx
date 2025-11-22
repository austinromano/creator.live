'use client';
import React from 'react';
import { Badge } from '@/components/ui/badge';
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
import { TestTube, Droplets, Copy, ExternalLink } from 'lucide-react';

export function NetworkIndicator() {
  const { address, isConnected } = useWallet();

  const requestAirdrop = async () => {
    if (!address) return;
    
    // Open Solana faucet in new tab
    window.open(`https://faucet.solana.com/?address=${address}`, '_blank');
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Badge 
          variant="secondary" 
          className="bg-orange-600/20 border-orange-500 text-orange-300 hover:bg-orange-600/30 cursor-pointer"
        >
          <TestTube className="h-3 w-3 mr-1" />
          DEVNET (TEST)
        </Badge>
      </DialogTrigger>
      
      <DialogContent className="bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <TestTube className="h-5 w-5 text-orange-500" />
            <span>Test Network Mode</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            You're using Solana Devnet - a test network with fake SOL that has no real value.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-orange-600/10 border border-orange-500/30 rounded-lg">
            <h3 className="font-semibold text-orange-300 mb-2">✅ Safe Testing Environment</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• All SOL is fake and has no real value</li>
              <li>• You can't lose actual money</li>
              <li>• Perfect for testing features safely</li>
              <li>• Transactions work the same as mainnet</li>
            </ul>
          </div>

          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-800 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Get Free Test SOL</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Need test SOL? Get up to 2 SOL for free from the Solana faucet!
                </p>
                
                <div className="flex items-center space-x-2 mb-3">
                  <code className="flex-1 p-2 bg-gray-700 rounded text-xs text-white font-mono break-all">
                    {address}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyAddress}
                    className="text-gray-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  onClick={requestAirdrop}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Droplets className="h-4 w-4 mr-2" />
                  Get Free Test SOL
                </Button>
              </div>

              <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                <h3 className="font-semibold text-blue-300 mb-2">How to Get Test SOL:</h3>
                <ol className="text-sm text-gray-300 space-y-1">
                  <li>1. Click "Get Free Test SOL" above</li>
                  <li>2. Complete the captcha on the faucet page</li>
                  <li>3. Wait ~30 seconds for the airdrop</li>
                  <li>4. Your balance will update automatically</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-800 rounded-lg text-center">
              <p className="text-gray-400 mb-3">
                Connect your wallet to get free test SOL
              </p>
              <p className="text-sm text-gray-500">
                You'll be able to request up to 2 SOL for testing
              </p>
            </div>
          )}

          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <a
              href="https://solscan.io/?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-gray-400"
            >
              <ExternalLink className="h-3 w-3" />
              <span>View on Solscan Devnet</span>
            </a>
            <span>•</span>
            <a
              href="https://faucet.solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-gray-400"
            >
              <Droplets className="h-3 w-3" />
              <span>Solana Faucet</span>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}