import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/user/follow - Follow a user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: targetUserId, username } = await request.json();

    // Find the user to follow by ID or username
    let targetUser;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, username: true },
      });
    } else if (username) {
      targetUser = await prisma.user.findUnique({
        where: { username },
        select: { id: true, username: true },
      });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Can't follow yourself
    if (targetUser.id === currentUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if already following
    const existingFollow = await prisma.follower.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUser.id,
        },
      },
    });

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 400 });
    }

    // Create follow relationship
    await prisma.follower.create({
      data: {
        followerId: currentUserId,
        followingId: targetUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Now following ${targetUser.username}`,
    });
  } catch (error) {
    console.error('Error following user:', error);
    return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 });
  }
}

// DELETE /api/user/follow - Unfollow a user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: targetUserId, username } = await request.json();

    // Find the user to unfollow by ID or username
    let targetUser;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, username: true },
      });
    } else if (username) {
      targetUser = await prisma.user.findUnique({
        where: { username },
        select: { id: true, username: true },
      });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete follow relationship
    await prisma.follower.deleteMany({
      where: {
        followerId: currentUserId,
        followingId: targetUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Unfollowed ${targetUser.username}`,
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 });
  }
}

// GET /api/user/follow?userId=xxx - Check if following a user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    const username = searchParams.get('username');

    // Find the target user
    let targetUser;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });
    } else if (username) {
      targetUser = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if following
    const follow = await prisma.follower.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUser.id,
        },
      },
    });

    return NextResponse.json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Error checking follow status:', error);
    return NextResponse.json({ error: 'Failed to check follow status' }, { status: 500 });
  }
}
