import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createRoute, BadRequestError, NotFoundError, ConflictError } from '@/lib/api/middleware';

const joinRoomSchema = z.object({
  roomId: z.string().min(1),
});

// POST /api/rooms/join - Join a room (add to user's rooms list)
export const POST = createRoute(
  async (_req, { userId }, body) => {
    const { roomId } = body;

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        icon: true,
        template: true,
        userId: true,
      },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Check if user is already the owner
    if (room.userId === userId) {
      throw new BadRequestError('You are the owner of this room');
    }

    // Check if user is already a member
    const existingMember = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: userId!,
        },
      },
    });

    if (existingMember) {
      throw new ConflictError('You have already joined this room');
    }

    // Add user as a member
    await prisma.roomMember.create({
      data: {
        roomId,
        userId: userId!,
      },
    });

    return {
      success: true,
      message: 'Successfully joined room',
      room: {
        id: room.id,
        name: room.name,
        icon: room.icon,
        template: room.template,
      },
    };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: joinRoomSchema }
);

// DELETE /api/rooms/join - Leave a room (remove from user's rooms list)
export const DELETE = createRoute(
  async (req, { userId }) => {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      throw new BadRequestError('roomId is required');
    }

    // Check if user is a member
    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: userId!,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError('You are not a member of this room');
    }

    // Remove membership
    await prisma.roomMember.delete({
      where: {
        id: membership.id,
      },
    });

    return {
      success: true,
      message: 'Successfully left room',
    };
  },
  { auth: 'required', authMode: 'id-only' }
);
