'use client';

import { Lock } from 'lucide-react';

interface SubscriptionCardProps {
  price: number;
  onSubscribe?: () => void;
}

export function SubscriptionCard({ price, onSubscribe }: SubscriptionCardProps) {
  return (
    <div className="mx-4 mt-2 mb-4 bg-gradient-to-r from-[#1a1525] to-[#1e1a2e] rounded-2xl p-3 sm:p-4 border border-purple-500/20 shadow-lg shadow-purple-500/5">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Lock icon with subtle background */}
        <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
          <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="text-white font-bold text-sm sm:text-base leading-tight">
            Subscribe for <span className="whitespace-nowrap">${price.toFixed(2)}/mo</span>
          </h3>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5 leading-tight">
            Unlock streams, chats & posts
          </p>
        </div>

        {/* Subscribe button */}
        <div className="relative flex-shrink-0">
          {/* Breathing glow effect */}
          <div className="absolute inset-0 bg-purple-500 rounded-full blur-sm animate-[pulse_1.5s_ease-in-out_infinite] opacity-40" />
          <button
            onClick={onSubscribe}
            className="relative bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold transition-all duration-200 shadow-lg shadow-purple-500/30"
          >
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
}
