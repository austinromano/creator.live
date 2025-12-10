import { prisma } from '@/lib/prisma';
import { TIME } from '@/lib/constants';
import { createRoute, NotFoundError, BadRequestError } from '@/lib/api/middleware';

export const GET = createRoute(
  async (_req, { params }) => {
    const username = params.username;

    if (!username) {
      throw new BadRequestError('Username is required');
    }

    const normalizedUsername = username.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        coverImage: true,
        bio: true,
        greeting: true,
        subscriptionPrice: true,
        subscriptionsEnabled: true,
        isVerified: true,
        lastSeenAt: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            streams: true,
          },
        },
        streams: {
          where: { isLive: true },
          select: {
            id: true,
            streamKey: true,
            title: true,
            viewerCount: true,
            startedAt: true,
          },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const tipsReceived = await prisma.tip.aggregate({
      where: { toWallet: user.id },
      _sum: { amountSol: true },
    });

    const liveStream = user.streams[0] || null;
    const now = Date.now();
    const isOnline = user.lastSeenAt
      ? now - new Date(user.lastSeenAt).getTime() < TIME.ONLINE_THRESHOLD
      : false;

    return {
      profile: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        greeting: user.greeting,
        subscriptionPrice: user.subscriptionPrice,
        subscriptionsEnabled: user.subscriptionsEnabled,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        isOnline,
        isLive: !!liveStream,
        liveStream: liveStream
          ? {
              id: liveStream.id,
              roomName: `user-${user.id}`,
              title: liveStream.title,
              viewerCount: liveStream.viewerCount,
              startedAt: liveStream.startedAt,
            }
          : null,
        stats: {
          posts: user._count.posts,
          followers: user._count.followers,
          following: user._count.following,
          streams: user._count.streams,
          earnings: tipsReceived._sum.amountSol || 0,
        },
      },
    };
  }
);
