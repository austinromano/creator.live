'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { useWallet } from '@/hooks/useWallet';
import { ChatMessage } from '@/lib/types';
import { 
  Send, 
  Heart, 
  DollarSign, 
  Crown,
  MessageCircle,
  Smile,
  Gift
} from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  creatorSymbol: string;
  className?: string;
}

export function LiveChat({ messages, onSendMessage, creatorSymbol, className = '' }: LiveChatProps) {
  const { isConnected, formatAddress } = useWallet();
  const [messageText, setMessageText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const emojis = ['😀', '😂', '❤️', '🚀', '🔥', '💎', '👏', '🌙', '⭐', '💯', '🎉', '🎊'];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    onSendMessage({
      user: isConnected ? formatAddress() : 'Anonymous',
      message: messageText,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
    });

    setMessageText('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const addEmoji = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getTipBadgeColor = (tipAmount: number) => {
    if (tipAmount >= 5) return 'bg-yellow-600 hover:bg-yellow-700';
    if (tipAmount >= 1) return 'bg-purple-600 hover:bg-purple-700';
    if (tipAmount >= 0.5) return 'bg-blue-600 hover:bg-blue-700';
    return 'bg-green-600 hover:bg-green-700';
  };

  return (
    <div className={`${className} flex flex-col h-full`}>
      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No messages yet</p>
            <p className="text-gray-500 text-xs">Be the first to say something!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex space-x-2 ${
                  message.isCreator ? 'bg-purple-600/10 p-2 rounded-lg border border-purple-600/20' : ''
                }`}
              >
                <Avatar className={`h-6 w-6 flex-shrink-0 ${message.isCreator ? 'ring-2 ring-purple-500' : ''}`}>
                  <AvatarImage src={message.avatar} />
                  <AvatarFallback className="text-xs bg-gray-700">
                    {message.user.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`font-semibold text-sm truncate ${
                      message.isCreator ? 'text-purple-300' : 'text-white'
                    }`}>
                      {message.user}
                    </span>
                    
                    {message.isCreator && (
                      <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                    )}
                    
                    {message.tip && (
                      <Badge 
                        variant="default" 
                        className={`text-xs px-1 py-0 ${getTipBadgeColor(message.tip)}`}
                      >
                        <DollarSign className="h-2 w-2 mr-1" />
                        {message.tip}
                      </Badge>
                    )}
                    
                    <span className="text-gray-500 text-xs flex-shrink-0">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 text-sm break-words leading-relaxed">
                    {message.message}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </CardContent>

      {/* Message Input */}
      <div className="p-3 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type a message..." : "Connect wallet to chat"}
              disabled={!isConnected}
              className="bg-gray-800 border-gray-600 text-white pr-10"
              maxLength={500}
            />
            
            {/* Emoji Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEmojis(!showEmojis)}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-white"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !messageText.trim()}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Character Counter */}
        {messageText && (
          <div className="flex justify-between items-center mt-1 text-xs">
            <span className="text-gray-500">
              {isConnected ? 'Press Enter to send' : 'Connect wallet to chat'}
            </span>
            <span className={`text-gray-500 ${messageText.length > 450 ? 'text-yellow-400' : ''}`}>
              {messageText.length}/500
            </span>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojis && (
          <div className="mt-2 p-2 bg-gray-700 rounded-lg border border-gray-600">
            <div className="grid grid-cols-6 gap-1">
              {emojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => addEmoji(emoji)}
                  className="text-lg hover:bg-gray-600 h-8 w-8 p-0"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Guidelines */}
        <div className="mt-2 text-xs text-gray-500">
          <p>💡 Tips appear with special badges • Be respectful • Support ${creatorSymbol}!</p>
        </div>
      </div>
    </div>
  );
}