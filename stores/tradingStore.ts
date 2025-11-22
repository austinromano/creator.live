'use client';
import { create } from 'zustand';
import { TradingState, Creator } from '@/lib/types';
import { TRADING_CONFIG } from '@/lib/constants';

export const useTradingStore = create<TradingState>((set, get) => ({
  selectedToken: null,
  tradeType: 'buy',
  amount: '',
  slippage: TRADING_CONFIG.defaultSlippage,

  setSelectedToken: (token: Creator | null) => {
    set({ selectedToken: token });
  },

  setTradeType: (type: 'buy' | 'sell') => {
    set({ tradeType: type });
  },

  setAmount: (amount: string) => {
    set({ amount });
  },

  setSlippage: (slippage: number) => {
    set({ slippage });
  },

  executeTrade: async () => {
    const { selectedToken, tradeType, amount, slippage } = get();
    
    if (!selectedToken || !amount) {
      throw new Error('Missing trade parameters');
    }

    // In a real implementation, this would:
    // 1. Create the transaction using @solana/web3.js
    // 2. Send it through the connected wallet
    // 3. Wait for confirmation
    
    // Simulate trade execution for demo
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Executing ${tradeType} for ${amount} SOL of ${selectedToken.symbol} with ${slippage}% slippage`);
        
        // Reset form after successful trade
        set({ amount: '' });
        resolve(void 0);
      }, 2000);
    });
  },
}));