import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createRoute, NotFoundError } from '@/lib/api/middleware';

const commentStarSchema = z.object({
  commentId: z.string().min(1),
});

// POST - Star a comment
export const POST = createRoute(
  async (_req, { userId }, body) => {
    const comment = await prisma.comment.findUnique({
      where: { id: body.commentId },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Check if already starred
    const existingStar = await prisma.commentStar.findUnique({
      where: {
        commentId_userId: {
          commentId: body.commentId,
          userId: userId!,
        },
      },
    });

    if (existingStar) {
      return { success: true, starred: true, message: 'Already starred' };
    }

    await prisma.commentStar.create({
      data: {
        commentId: body.commentId,
        userId: userId!,
      },
    });

    return { success: true, starred: true };
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
