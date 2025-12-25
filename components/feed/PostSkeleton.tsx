export function PostSkeleton() {
  return (
    <article className="mb-6 rounded-xl overflow-hidden bg-black border border-gray-800/50 animate-pulse">
      {/* Header Skeleton */}
      <div className="p-3 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-gray-800" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-gray-800 rounded mb-1" />
          <div className="h-3 w-16 bg-gray-800 rounded" />
        </div>
      </div>

      {/* Media Skeleton */}
      <div className="w-full aspect-[4/5] bg-gray-900" />

      {/* Action Buttons Skeleton */}
      <div className="p-3">
        <div className="flex items-center gap-4 mb-3">
          <div className="h-7 w-7 rounded-full bg-gray-800" />
          <div className="h-7 w-7 rounded-full bg-gray-800" />
          <div className="h-7 w-7 rounded-full bg-gray-800" />
        </div>

        {/* Count Skeleton */}
        <div className="h-4 w-32 bg-gray-800 rounded mb-2" />

        {/* Caption Skeleton */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-gray-800 rounded" />
          <div className="h-3 w-3/4 bg-gray-800 rounded" />
        </div>
      </div>
    </article>
  );
}
