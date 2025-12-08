import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/user/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;

    if (!sessionUser?.email && !sessionUser?.walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(sessionUser.email ? [{ email: sessionUser.email }] : []),
          ...(sessionUser.walletAddress ? [{ walletAddress: sessionUser.walletAddress }] : []),
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { displayName, bio, subscriptionPrice, subscriptionsEnabled } = body;

    // Update the user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(subscriptionPrice !== undefined && { subscriptionPrice }),
        ...(subscriptionsEnabled !== undefined && { subscriptionsEnabled }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        subscriptionPrice: true,
        subscriptionsEnabled: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
