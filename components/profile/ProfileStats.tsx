'use client';

interface ProfileStatsProps {
  isSubscriber?: boolean;
}

export function ProfileStats({
  isSubscriber = false,
}: ProfileStatsProps) {
  return (
    <div className="px-4 py-2">
      {/* Subscriber badge */}
      {isSubscriber && (
        <div className="flex justify-center mb-3">
          <span className="text-purple-400 text-xs font-semibold tracking-wide">
            SUBSCRIBER
          </span>
        </div>
      )}
    </div>
  );
}
