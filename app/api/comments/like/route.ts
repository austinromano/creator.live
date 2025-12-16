import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createRoute, NotFoundError } from '@/lib/api/middleware';

const commentStarSchema = z.object({
  commentId: z.string().min(1),
});

// POST - Star a comment (atomic upsert to prevent race conditions)
export const POST = createRoute(
  async (_req, { userId }, body) => {
    const comment = await prisma.comment.findUnique({
      where: { id: body.commentId },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Atomic upsert - handles race conditions where multiple requests try to star simultaneously
    try {
      await prisma.commentStar.upsert({
        where: {
          commentId_userId: {
            commentId: body.commentId,
            userId: userId!,
          },
        },
        create: {
          commentId: body.commentId,
          userId: userId!,
        },
        update: {}, // No-op if already exists
      });

      return { success: true, starred: true };
    } catch (error) {
      // Handle unique constraint violation (shouldn't happen with upsert, but safety net)
      if ((error as any)?.code === 'P2002') {
        return { success: true, starred: true, message: 'Already starred' };
      }
      throw error;
    }
  },
  { auth: 'required', authMode: 'id-only', bodySchema: commentStarSchema }
);

// DELETE - Unstar a comment
export const DELETE = createRoute(
  async (_req, { userId }, body) => {
    const existingStar = await prisma.commentStar.findUnique({
      where: {
        commentId_userId: {
          commentId: body.commentId,
          userId: userId!,
        },
      },
    });

    if (!existingStar) {
      return { success: true, starred: false, message: 'Not starred' };
    }

    await prisma.commentStar.delete({
      where: {
        commentId_userId: {
          commentId: body.commentId,
          userId: userId!,
        },
      },
    });

    return { success: true, starred: false };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: commentStarSchema }
);
