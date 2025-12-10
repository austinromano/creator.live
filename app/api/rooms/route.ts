import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createRoute } from '@/lib/api/middleware';

// Schema for creating a room
const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  template: z.string().nullish(),
  icon: z.string().nullish(),
});

// GET /api/rooms - Get user's rooms
export const GET = createRoute(
  async (_request: NextRequest, { userId }) => {
    const rooms = await prisma.room.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { rooms };
  },
  { auth: 'required', authMode: 'id-only' }
);

// POST /api/rooms - Create a new room
export const POST = createRoute(
  async (_request: NextRequest, { userId }, body) => {
    console.log('Creating room with:', { userId, body });

    const room = await prisma.room.create({
      data: {
        userId: userId!,
        name: body.name,
        template: body.template || null,
        icon: body.icon || null,
      },
    });

    console.log('Room created:', room);
    return { room };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: createRoomSchema }
);
