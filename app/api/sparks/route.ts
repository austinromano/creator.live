import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createRoute, NotFoundError, BadRequestError } from '@/lib/api/middleware';

const sparkSchema = z.object({
  postId: z.string().min(1),
});

export const POST = createRoute(
  async (_req, { userId }, body) => {
    const post = await prisma.post.findUnique({
      where: { id: body.postId },
      select: { userId: true },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const existingSpark = await prisma.spark.findUnique({
      where: {
        userId_postId: {
          userId: userId!,
          postId: body.postId,
        },
      },
    });

    if (existingSpark) {
      throw new BadRequestError('Already sparked');
    }

    await prisma.$transaction(async (tx) => {
      await tx.spark.create({
        data: {
          userId: userId!,
          postId: body.postId,
        },
      });

      await tx.post.update({
        where: { id: body.postId },
        data: { viewerCount: { increment: 1 } },
      });

      if (post.userId !== userId) {
        await tx.notification.create({
          data: {
            userId: post.userId,
            fromUserId: userId!,
            type: 'spark',
            postId: body.postId,
          },
        });
      }
    });

    return { success: true, sparked: true };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: sparkSchema }
);

export const DELETE = createRoute(
  async (_req, { userId }, body) => {
    const post = await prisma.post.findUnique({
      where: { id: body.postId },
      select: { userId: true },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.spark.deleteMany({
        where: {
          userId: userId!,
          postId: body.postId,
        },
      });

      await tx.post.update({
        where: { id: body.postId },
        data: { viewerCount: { decrement: 1 } },
      });

      await tx.notification.deleteMany({
        where: {
          userId: post.userId,
          fromUserId: userId!,
          type: 'spark',
          postId: body.postId,
        },
      });
    });

    return { success: true, sparked: false };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: sparkSchema }
);
