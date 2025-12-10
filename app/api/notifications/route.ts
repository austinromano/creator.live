import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createRoute, BadRequestError } from '@/lib/api/middleware';

const createNotificationSchema = z.object({
  toUserId: z.string().min(1),
  type: z.string().min(1),
  postId: z.string().optional(),
  message: z.string().max(500).optional(),
});

const deleteNotificationSchema = z.object({
  toUserId: z.string().min(1),
  type: z.string().min(1),
  postId: z.string().optional(),
});

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAllRead: z.boolean().optional(),
});

export const GET = createRoute(
  async (req, { userId }) => {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: userId!,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        include: {
          fromUser: {
            select: {
              id: true,
              username: true,
              avatar: true,
              displayName: true,
              isVerified: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({
        where: {
          userId: userId!,
          isRead: false,
        },
      }),
    ]);

    return { notifications, unreadCount };
  },
  { auth: 'required', authMode: 'id-only' }
);

export const POST = createRoute(
  async (_req, { userId }, body) => {
    // Don't notify yourself
    if (body.toUserId === userId) {
      return { success: true, notification: null };
    }

    const notification = await prisma.notification.create({
      data: {
        userId: body.toUserId,
        fromUserId: userId!,
        type: body.type,
        postId: body.postId || null,
        message: body.message || null,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            avatar: true,
            displayName: true,
          },
        },
      },
    });

    return { success: true, notification };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: createNotificationSchema }
);

export const DELETE = createRoute(
  async (_req, { userId }, body) => {
    await prisma.notification.deleteMany({
      where: {
        userId: body.toUserId,
        fromUserId: userId!,
        type: body.type,
        ...(body.postId ? { postId: body.postId } : {}),
      },
    });

    return { success: true };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: deleteNotificationSchema }
);

export const PATCH = createRoute(
  async (_req, { userId }, body) => {
    if (body.markAllRead) {
      await prisma.notification.updateMany({
        where: {
          userId: userId!,
          isRead: false,
        },
        data: { isRead: true },
      });
    } else if (body.notificationIds && body.notificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: body.notificationIds },
          userId: userId!,
        },
        data: { isRead: true },
      });
    }

    return { success: true };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: markReadSchema }
);
