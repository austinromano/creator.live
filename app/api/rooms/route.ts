import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createRoute } from '@/lib/api/middleware';

// Schema for creating a room
const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullish(),
  template: z.string().nullish(),
  icon: z.string().nullish(),
  visibility: z.enum(['public', 'private', 'approval']).default('public'),
  invitedFriends: z.array(z.string()).optional(),
});

// GET /api/rooms - Get user's owned and joined rooms
export const GET = createRoute(
  async (_request: NextRequest, { userId }) => {
    // Get rooms the user owns with member count
    const ownedRooms = await prisma.room.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        _count: {
          select: { members: true },
        },
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
          include: {
            _count: {
              select: { members: true },
            },
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

    // Map rooms to include memberCount
    const formatRoom = (room: any) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      icon: room.icon,
      template: room.template,
      visibility: room.visibility,
      isActive: room.isActive,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      userId: room.userId,
      memberCount: (room._count?.members || 0) + 1, // +1 for owner
    });

    const formattedOwnedRooms = ownedRooms.map(formatRoom);
    const formattedJoinedRooms = joinedRooms.map(formatRoom);

    // Combine owned and joined rooms, with owned first
    const rooms = [...formattedOwnedRooms, ...formattedJoinedRooms];

    return { rooms, ownedRooms: formattedOwnedRooms, joinedRooms: formattedJoinedRooms };
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
        description: body.description || null,
        template: body.template || null,
        icon: body.icon || null,
        visibility: body.visibility || 'public',
      },
    });

    // Add invited friends as room members
    if (body.invitedFriends && body.invitedFriends.length > 0) {
      await prisma.roomMember.createMany({
        data: body.invitedFriends.map((friendId: string) => ({
          roomId: room.id,
          userId: friendId,
        })),
        skipDuplicates: true,
      });

      // Create notifications for invited friends
      await prisma.notification.createMany({
        data: body.invitedFriends.map((friendId: string) => ({
          userId: friendId,
          fromUserId: userId!,
          type: 'room_invite',
          roomId: room.id,
          message: `invited you to join ${room.name}`,
        })),
      });
    }

    console.log('Room created:', room);
    return { room };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: createRoomSchema }
);
