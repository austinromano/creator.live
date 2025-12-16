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
  async (req: NextRequest, { userId }) => {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    console.log('[Comments API] GET request for postId:', postId, 'userId:', userId);

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
        stars: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            stars: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    console.log('[Comments API] Found', comments.length, 'comments for postId:', postId);

    // Transform to include starCount and starred status
    const transformedComments = comments.map((comment) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      user: comment.user,
      starCount: comment._count.stars,
      starred: userId ? comment.stars.some((star) => star.userId === userId) : false,
    }));

    return { comments: transformedComments };
  },
  { auth: 'optional' }
);

// POST - Create a new comment
export const POST = createRoute(
  async (_req, { userId }, body) => {
    console.log('[Comments API] POST received:', { userId, postId: body.postId, textLength: body.text?.length });

    if (!userId) {
      console.error('[Comments API] No userId in context - auth may have failed');
      throw new NotFoundError('User not authenticated');
    }

    const post = await prisma.post.findUnique({
      where: { id: body.postId },
      select: { userId: true },
    });

    if (!post) {
      console.log('[Comments API] Post not found:', body.postId);
      throw new NotFoundError('Post not found');
    }

    console.log('[Comments API] Creating comment in database...');

    // Create comment
    const newComment = await prisma.comment.create({
      data: {
        userId: userId,
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

    console.log('[Comments API] Comment created with ID:', newComment.id);

    // Verify the comment was actually saved
    const verifyComment = await prisma.comment.findUnique({
      where: { id: newComment.id },
    });

    if (!verifyComment) {
      console.error('[Comments API] CRITICAL: Comment was not found after creation!');
      throw new Error('Comment creation failed - verification failed');
    }

    console.log('[Comments API] Comment verified in database:', verifyComment.id);

    // Create notification for post owner (if not commenting on own post)
    if (post.userId !== userId) {
      try {
        await prisma.notification.create({
          data: {
            userId: post.userId,
            fromUserId: userId,
            type: 'comment',
            postId: body.postId,
            message: body.text.substring(0, 100),
          },
        });
        console.log('[Comments API] Notification created');
      } catch (notifError) {
        console.error('[Comments API] Failed to create notification:', notifError);
        // Don't fail the comment creation if notification fails
      }
    }

    // Return comment with starCount and starred fields (createdAt as ISO string)
    const comment = {
      id: newComment.id,
      text: newComment.text,
      createdAt: newComment.createdAt.toISOString(),
      user: newComment.user,
      starCount: 0,
      starred: false,
    };

    console.log('[Comments API] Returning success response');
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
