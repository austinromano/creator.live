'use client';

interface ProfileStatsProps {
  posts?: number;
  followers?: number;
  following?: number;
  isSubscriber?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function ProfileStats({
  posts = 0,
  followers = 0,
  following = 0,
  isSubscriber = false,
}: ProfileStatsProps) {
  return (
    <div className="px-4 py-4">
      {/* Stats row */}
      <div className="flex justify-center gap-8">
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-lg">{formatNumber(posts)}</span>
          <span className="text-gray-400 text-xs">Posts</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-lg">{formatNumber(followers)}</span>
          <span className="text-gray-400 text-xs">Followers</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-lg">{formatNumber(following)}</span>
          <span className="text-gray-400 text-xs">Following</span>
        </div>
      </div>

      {/* Subscriber badge */}
      {isSubscriber && (
        <div className="flex justify-center mt-3">
          <span className="bg-purple-600/20 text-purple-400 text-xs font-semibold tracking-wide px-3 py-1 rounded-full border border-purple-500/30">
            SUBSCRIBER
          </span>
        </div>
      )}
    </div>
  );
}
