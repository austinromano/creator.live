import { prisma } from '@/lib/prisma';
import { createRoute } from '@/lib/api/middleware';

export const GET = createRoute(async () => {
  const liveStreams = await prisma.stream.findMany({
    where: { isLive: true },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  return {
    success: true,
    streams: liveStreams.map((stream) => ({
      id: stream.id,
      title: stream.title,
      streamKey: stream.streamKey,
      viewerCount: stream.viewerCount,
      startedAt: stream.startedAt,
      user: {
        id: stream.user.id,
        username: stream.user.username,
        avatar: stream.user.avatar,
      },
    })),
  };
});
