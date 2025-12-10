import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthId, errorResponse, NotFoundError, ForbiddenError, BadRequestError } from '@/lib/api/middleware';

const updateRoomSchema = z.object({
  allowMemberInvites: z.boolean().optional(),
});

// GET /api/rooms/[id] - Get room details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuthId();
    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            lastSeenAt: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Check if current user is a member of this room
    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: id,
          userId,
        },
      },
    });

    // Check if user is online (seen in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isOwnerOnline = room.user.lastSeenAt && room.user.lastSeenAt > fiveMinutesAgo;

    // For now, the room has the owner as the only member
    // In a real app, you'd have a RoomMember table
    const roomWithMembers = {
      id: room.id,
      name: room.name,
      icon: room.icon,
      template: room.template,
      userId: room.user.id,
      isMember: !!membership,
      allowMemberInvites: room.allowMemberInvites,
      members: [
        {
          id: room.user.id,
          username: room.user.username,
          displayName: room.user.displayName,
          avatar: room.user.avatar,
          isOnline: isOwnerOnline,
          isHost: true,
        },
      ],
    };

    return NextResponse.json({ room: roomWithMembers });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/rooms/[id] - Delete room (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuthId();
    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Only the room owner can delete the room
    if (room.userId !== userId) {
      throw new ForbiddenError('Only the room owner can delete this room');
    }

    // Delete the room (this will cascade delete related notifications due to onDelete: Cascade)
    await prisma.room.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/rooms/[id] - Update room settings (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuthId();
    const { id } = await params;
    const body = await request.json();

    const result = updateRoomSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestError('Invalid request data');
    }

    const room = await prisma.room.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Only the room owner can update settings
    if (room.userId !== userId) {
      throw new ForbiddenError('Only the room owner can update settings');
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json({
      success: true,
      room: {
        id: updatedRoom.id,
        allowMemberInvites: updatedRoom.allowMemberInvites,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
