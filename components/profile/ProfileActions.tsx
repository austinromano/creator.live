'use client';

import { Button } from '@/components/ui/button';

interface ProfileActionsProps {
  isFollowing?: boolean;
  onFollow?: () => void;
  onTip?: () => void;
}

export function ProfileActions({
  isFollowing = false,
  onFollow,
  onTip,
}: ProfileActionsProps) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-4">
      <Button
        onClick={onFollow}
        className="flex-1 max-w-[140px] bg-black border border-gray-700 text-white hover:bg-gray-900 rounded-full py-5"
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
      <Button
        onClick={onTip}
        className="flex-1 max-w-[140px] bg-black border border-gray-700 text-white hover:bg-gray-900 rounded-full py-5"
      >
        Tip
      </Button>
    </div>
  );
}
