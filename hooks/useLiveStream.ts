'use client';
import { useState, useEffect } from 'react';
import { ChatMessage } from '@/lib/types';

export const useLiveStream = (creatorSymbol: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewers, setViewers] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendTip = async (amount: number, message: string) => {
    addMessage({
      user: 'You',
      message,
      tip: amount,
    });
  };

  // Simulate live updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // Random viewer count changes
      setViewers(prev => Math.max(0, prev + Math.floor(Math.random() * 10 - 5)));
      
      // Occasional new messages
      if (Math.random() < 0.3) {
        const users = ['CryptoFan123', 'DiamondHands', 'ToTheMoon', 'HODLer'];
        const messageTemplates = [
          'Love the content!',
          'When moon?',
          'Great stream!',
          'Token looking good 🚀',
          'LFG!!!',
        ];
        
        addMessage({
          user: users[Math.floor(Math.random() * users.length)],
          message: messageTemplates[Math.floor(Math.random() * messageTemplates.length)],
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive]);

  return {
    messages,
    viewers,
    isLive,
    setIsLive,
    addMessage,
    sendTip,
  };
};