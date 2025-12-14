import { z } from 'zod';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRoute, NotFoundError, ForbiddenError } from '@/lib/api/middleware';

const createCommentSchema = z.object({
  postId: z.string().min(1),
  text: z.string().min(1).max(500),
});

const deleteCommentSchema = z.object({
  commentId: z.string().min(1),
});

// GET - Fetch comments for a post
export const GET = createRoute(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return { comments: [] };
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { comments };
  },
  { auth: 'optional' }
);

// POST - Create a new comment
export const POST = createRoute(
  async (_req, { userId }, body) => {
    const post = await prisma.post.findUnique({
      where: { id: body.postId },
      select: { userId: true },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          userId: userId!,
          postId: body.postId,
          text: body.text,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
      });

      // Create notification for post owner (if not commenting on own post)
      if (post.userId !== userId) {
        await tx.notification.create({
          data: {
            userId: post.userId,
            fromUserId: userId!,
            type: 'comment',
            postId: body.postId,
            message: body.text.substring(0, 100),
          },
        });
      }

      return newComment;
    });

    return { success: true, comment };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: createCommentSchema }
);

// DELETE - Delete a comment
export const DELETE = createRoute(
  async (_req, { userId }, body) => {
    const comment = await prisma.comment.findUnique({
      where: { id: body.commentId },
      select: { userId: true, postId: true },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Only allow comment owner to delete
    if (comment.userId !== userId) {
      throw new ForbiddenError('Not authorized to delete this comment');
    }

    await prisma.comment.delete({
      where: { id: body.commentId },
    });

    return { success: true };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: deleteCommentSchema }
);
