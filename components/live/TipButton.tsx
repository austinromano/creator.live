'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { Creator } from '@/lib/types';
import { 
  DollarSign, 
  Heart, 
  Zap, 
  Gift,
  Wallet,
  Send,
  Sparkles
} from 'lucide-react';

interface TipButtonProps {
  creator: Creator;
  onTip: (amount: number, message: string) => Promise<void>;
  className?: string;
}

export function TipButton({ creator, onTip, className = '' }: TipButtonProps) {
  const { isConnected, balance, connect } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const presetAmounts = [0.1, 0.5, 1, 2, 5];

  const handleTip = async () => {
    if (!isConnected) {
      connect();
      return;
    }

    const tipAmount = parseFloat(amount);
    if (!tipAmount || tipAmount <= 0) return;
    
    if (tipAmount > balance) {
      alert('Insufficient balance');
      return;
    }

    setIsSending(true);
    try {
      await onTip(tipAmount, message || `Tipped ${tipAmount} SOL to ${creator.name}!`);
      setAmount('');
      setMessage('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to send tip:', error);
      alert('Failed to send tip. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const getTipIcon = (amount: number) => {
    if (amount >= 5) return <Sparkles className="h-4 w-4" />;
    if (amount >= 1) return <Gift className="h-4 w-4" />;
    if (amount >= 0.5) return <Heart className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  const getTipColor = (amount: number) => {
    if (amount >= 5) return 'from-yellow-500 to-orange-500';
    if (amount >= 1) return 'from-purple-500 to-pink-500';
    if (amount >= 0.5) return 'from-blue-500 to-cyan-500';
    return 'from-green-500 to-emerald-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className={`${className} bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold`}
        >
          <Heart className="h-4 w-4 mr-2" />
          Tip Creator
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span>Tip {creator.name}</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Show your appreciation with a tip! Tips appear in chat and support the creator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Creator Info */}
          <Card className="bg-gray-800/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {creator.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{creator.name}</h3>
                  <p className="text-purple-400 font-mono text-sm">${creator.symbol}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Amount Presets */}
          <div className="space-y-2">
            <Label className="text-white">Quick Tip Amounts</Label>
            <div className="grid grid-cols-3 gap-2">
              {presetAmounts.map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(preset.toString())}
                  className={`border-gray-600 text-gray-300 hover:border-yellow-500 hover:text-white ${
                    amount === preset.toString() ? 'border-yellow-500 text-yellow-400' : ''
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    {getTipIcon(preset)}
                    <span>{preset} SOL</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label htmlFor="tip-amount" className="text-white">Custom Amount (SOL)</Label>
            <Input
              id="tip-amount"
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
              min="0"
              step="0.001"
            />
            {isConnected && (
              <p className="text-xs text-gray-400">
                Your balance: {balance.toFixed(4)} SOL
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="tip-message" className="text-white">Message (Optional)</Label>
            <Textarea
              id="tip-message"
              placeholder="Say something nice..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white resize-none"
              maxLength={200}
            />
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Add a personal message with your tip</span>
              <span className="text-gray-500">{message.length}/200</span>
            </div>
          </div>

          {/* Preview */}
          {amount && parseFloat(amount) > 0 && (
            <Card className="bg-gray-800/30 border-gray-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 bg-gradient-to-r ${getTipColor(parseFloat(amount))} rounded-full flex items-center justify-center`}>
                      {getTipIcon(parseFloat(amount))}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{parseFloat(amount).toFixed(3)} SOL</p>
                      <p className="text-gray-400 text-sm">≈ ${(parseFloat(amount) * 100).toFixed(2)} USD</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-600 hover:bg-yellow-700">
                    Tip
                  </Badge>
                </div>
                {message && (
                  <p className="text-gray-300 text-sm mt-2 italic">"{message}"</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-gray-600 text-gray-300 hover:text-white"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleTip}
            disabled={!amount || parseFloat(amount) <= 0 || isSending || (isConnected && parseFloat(amount) > balance)}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
          >
            {!isConnected ? (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </>
            ) : isSending ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Tip {amount && `(${parseFloat(amount).toFixed(3)} SOL)`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}