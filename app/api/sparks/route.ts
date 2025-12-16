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

    // Use upsert to atomically handle race conditions
    // If spark exists, do nothing (onConflict). If not, create it.
    try {
      await prisma.$transaction(async (tx) => {
        // Atomic upsert - prevents race condition duplicates
        const spark = await tx.spark.upsert({
          where: {
            userId_postId: {
              userId: userId!,
              postId: body.postId,
            },
          },
          create: {
            userId: userId!,
            postId: body.postId,
          },
          update: {}, // No-op if exists
        });

        // Only increment if this is a new spark (check createdAt vs now)
        const isNewSpark = Date.now() - new Date(spark.createdAt).getTime() < 1000;

        if (isNewSpark) {
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
        }
      });

      return { success: true, sparked: true };
    } catch (error) {
      // Handle any remaining edge cases
      if ((error as any)?.code === 'P2002') {
        return { success: true, sparked: true, message: 'Already sparked' };
      }
      throw error;
    }
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
