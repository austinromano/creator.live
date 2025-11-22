'use client';
import { useConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect } from 'react';

export const useWallet = () => {
  const { connection } = useConnection();
  const { publicKey, connected, disconnect: walletDisconnect } = useSolanaWallet();
  const { setVisible } = useWalletModal();
  const [balance, setBalance] = useState(0);

  // Fetch balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      const fetchBalance = async () => {
        try {
          const balance = await connection.getBalance(publicKey);
          setBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance(0);
        }
      };
      
      fetchBalance();
      
      // Refresh balance every 10 seconds
      const interval = setInterval(fetchBalance, 10000);
      return () => clearInterval(interval);
    } else {
      setBalance(0);
    }
  }, [connection, publicKey, connected]);

  const connect = () => {
    setVisible(true);
  };

  const disconnect = () => {
    walletDisconnect();
    setBalance(0);
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: number) => {
    return `${bal.toFixed(4)} SOL`;
  };

  return {
    isConnected: connected,
    address: publicKey?.toString() || null,
    balance,
    connect,
    disconnect,
    formatAddress: () => formatAddress(publicKey?.toString() || null),
    formatBalance: () => formatBalance(balance),
  };
};