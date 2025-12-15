import { prisma } from '@/lib/prisma';
import { TIME } from '@/lib/constants';
import { createRoute } from '@/lib/api/middleware';
import type { Stream } from '@/lib/types/stream';

export const GET = createRoute(async () => {
  // Return streams that are LIVE - check both new status field and legacy isLive field
  // Exclude PREVIEW streams (those are private until "Go Live" is clicked)
  const liveStreams = await prisma.stream.findMany({
    where: {
      OR: [
        { status: 'LIVE' },
        { isLive: true, status: { notIn: ['PREVIEW', 'ENDED', 'IDLE'] } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          walletAddress: true,
          isAI: true,
          lastSeenAt: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  const now = Date.now();

  const streams: Stream[] = liveStreams.map((dbStream) => {
    const user = dbStream.user;
    return {
      id: dbStream.id,
      roomName: `user-${dbStream.userId}`,
      title: dbStream.title || `${user.username}'s Live Stream`,
      category: dbStream.category,
      isLive: dbStream.isLive,
      viewerCount: dbStream.viewerCount,
      startedAt: dbStream.startedAt?.toISOString() || null,
      thumbnail: dbStream.thumbnail,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        walletAddress: user.walletAddress,
        isAI: user.isAI,
        isOnline: user.lastSeenAt
          ? now - new Date(user.lastSeenAt).getTime() < TIME.ONLINE_THRESHOLD
          : false,
      },
    };
  });

  return { streams };
});
