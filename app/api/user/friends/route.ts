import { prisma } from '@/lib/prisma';
import { TIME } from '@/lib/constants';
import { createRoute } from '@/lib/api/middleware';

export const GET = createRoute(
  async (_req, { userId }) => {
    const following = await prisma.follower.findMany({
      where: { followerId: userId! },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            displayName: true,
            isVerified: true,
            lastSeenAt: true,
            streams: {
              where: { isLive: true },
              select: {
                id: true,
                streamKey: true,
                title: true,
                viewerCount: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();

    const friends = following.map((f) => {
      const user = f.following;
      const liveStream = user.streams?.[0] || null;
      const isOnline = user.lastSeenAt
        ? now - new Date(user.lastSeenAt).getTime() < TIME.ONLINE_THRESHOLD
        : false;

      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isOnline,
        isLive: !!liveStream,
        liveStream: liveStream
          ? {
              id: liveStream.id,
              roomName: `user-${user.id}`,
              title: liveStream.title,
              viewerCount: liveStream.viewerCount,
            }
          : null,
        followedAt: f.createdAt,
      };
    });

    // Sort: live users first, then online users, then by follow date
    friends.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime();
    });

    return { friends };
  },
  { auth: 'required', authMode: 'id-only' }
);
