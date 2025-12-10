import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthId, errorResponse, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api/middleware';

const inviteSchema = z.object({
  roomId: z.string().min(1),
  userId: z.string().min(1),
});

// POST /api/rooms/invite - Send a room invite notification to a user
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await requireAuthId();
    const body = await request.json();

    const result = inviteSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestError('Invalid request data');
    }

    const { roomId, userId } = result.data;

    // Verify the room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Check if user can invite:
    // - Owner can always invite
    // - Members can invite if allowMemberInvites is true
    const isOwner = room.userId === currentUserId;

    if (!isOwner) {
      // Check if user is a member
      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: currentUserId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenError('You must be a member of this room to send invites');
      }

      if (!room.allowMemberInvites) {
        throw new ForbiddenError('Only the room owner can send invites');
      }
    }

    // Verify the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Create a notification for the room invite
    await prisma.notification.create({
      data: {
        userId: userId,
        fromUserId: currentUserId,
        type: 'room_invite',
        message: `${room.user.displayName || room.user.username} invited you to join "${room.name}"`,
        roomId: roomId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Invite sent successfully',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
