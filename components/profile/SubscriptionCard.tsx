'use client';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubscriptionCardProps {
  price: number;
  onSubscribe?: () => void;
}

export function SubscriptionCard({ price, onSubscribe }: SubscriptionCardProps) {
  return (
    <div className="mx-4 my-4 bg-[#1a1a1d] rounded-2xl p-4 flex items-center gap-4">
      {/* Lock icon */}
      <div className="flex-shrink-0">
        <Lock className="h-8 w-8 text-gray-400" />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-sm">
          Subscribe for ${price.toFixed(2)}/month
        </h3>
        <p className="text-gray-500 text-xs mt-0.5">
          Unlock premium streams, chats, and bonus posts.
        </p>
      </div>

      {/* Subscribe button */}
      <Button
        onClick={onSubscribe}
        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-5 py-2 text-sm font-medium flex-shrink-0"
      >
        Subscribe
      </Button>
    </div>
  );
}
