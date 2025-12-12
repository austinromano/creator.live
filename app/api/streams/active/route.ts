import { prisma } from '@/lib/prisma';
import { createRoute } from '@/lib/api/middleware';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get the current user's active stream
export const GET = createRoute(async (req) => {
  const session = await getServerSession(authOptions);

  console.log('[/api/streams/active] Session:', session?.user?.id ? `User ID: ${session.user.id}` : 'No session');

  if (!session?.user?.id) {
    console.log('[/api/streams/active] No session user ID, returning null');
    return { stream: null };
  }

  const userId = session.user.id;
  console.log('[/api/streams/active] Looking for active stream for userId:', userId);

  // Find active stream for this user
  const stream = await prisma.stream.findFirst({
    where: {
      userId,
      isLive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
  });

  console.log('[/api/streams/active] Stream found:', stream ? `ID: ${stream.id}, isLive: ${stream.isLive}` : 'No stream');

  if (!stream) {
    console.log('[/api/streams/active] No active stream found, returning null');
    return { stream: null };
  }

  console.log('[/api/streams/active] Returning stream with roomName:', `user-${stream.userId}`);
  return {
    stream: {
      id: stream.id,
      roomName: `user-${stream.userId}`,
      title: stream.title,
      category: stream.category,
      isLive: stream.isLive,
      viewerCount: stream.viewerCount,
      startedAt: stream.startedAt?.toISOString() || null,
      user: stream.user,
    },
  };
});
