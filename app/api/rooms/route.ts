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

// GET /api/rooms - Get user's owned and joined rooms
export const GET = createRoute(
  async (_request: NextRequest, { userId }) => {
    // Get rooms the user owns
    const ownedRooms = await prisma.room.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get rooms the user has joined (as a member)
    const joinedRoomMemberships = await prisma.roomMember.findMany({
      where: {
        userId,
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            icon: true,
            template: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    // Filter out inactive rooms and extract room data
    const joinedRooms = joinedRoomMemberships
      .filter((m) => m.room.isActive)
      .map((m) => m.room);

    // Combine owned and joined rooms, with owned first
    const rooms = [...ownedRooms, ...joinedRooms];

    return { rooms, ownedRooms, joinedRooms };
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
