import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createRoute, NotFoundError, BadRequestError } from '@/lib/api/middleware';

const followSchema = z.object({
  userId: z.string().optional(),
  username: z.string().optional(),
}).refine(data => data.userId || data.username, {
  message: 'Either userId or username is required',
});

async function findTargetUser(userId?: string, username?: string) {
  if (userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
  }
  if (username) {
    return prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true },
    });
  }
  return null;
}

export const POST = createRoute(
  async (_req, { userId }, body) => {
    const targetUser = await findTargetUser(body.userId, body.username);

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    if (targetUser.id === userId) {
      throw new BadRequestError('Cannot follow yourself');
    }

    const existingFollow = await prisma.follower.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId!,
          followingId: targetUser.id,
        },
      },
    });

    if (existingFollow) {
      throw new BadRequestError('Already following this user');
    }

    await prisma.follower.create({
      data: {
        followerId: userId!,
        followingId: targetUser.id,
      },
    });

    return {
      success: true,
      message: `Now following ${targetUser.username}`,
    };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: followSchema }
);

export const DELETE = createRoute(
  async (_req, { userId }, body) => {
    const targetUser = await findTargetUser(body.userId, body.username);

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    await prisma.follower.deleteMany({
      where: {
        followerId: userId!,
        followingId: targetUser.id,
      },
    });

    return {
      success: true,
      message: `Unfollowed ${targetUser.username}`,
    };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: followSchema }
);

export const GET = createRoute(
  async (req, { userId }) => {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');
    const username = searchParams.get('username');

    const targetUser = await findTargetUser(targetUserId ?? undefined, username ?? undefined);

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    const follow = await prisma.follower.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId!,
          followingId: targetUser.id,
        },
      },
    });

    return { isFollowing: !!follow };
  },
  { auth: 'required', authMode: 'id-only' }
);
