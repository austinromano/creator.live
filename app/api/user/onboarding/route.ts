import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Reserved usernames that can't be claimed
const RESERVED_USERNAMES = [
  'admin', 'support', 'help', 'api', 'www', 'app', 'mail',
  'official', 'osho', 'system', 'mod', 'moderator', 'staff',
  'null', 'undefined', 'anonymous', 'user', 'guest', 'test',
];

// POST /api/user/onboarding - Complete user onboarding
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username, image } = body;

    // Validate username exists
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Normalize: trim whitespace and convert to lowercase
    const normalizedUsername = username.trim().toLowerCase();

    // Length validation
    if (normalizedUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (normalizedUsername.length > 20) {
      return NextResponse.json(
        { error: 'Username must be 20 characters or less' },
        { status: 400 }
      );
    }

    // Character validation - only letters, numbers, underscores
    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Can't start with underscore or number
    if (/^[_0-9]/.test(normalizedUsername)) {
      return NextResponse.json(
        { error: 'Username must start with a letter' },
        { status: 400 }
      );
    }

    // Reserved username check
    if (RESERVED_USERNAMES.includes(normalizedUsername)) {
      return NextResponse.json(
        { error: 'This username is not available' },
        { status: 400 }
      );
    }

    // Build update data - let schema defaults handle greeting/subscriptionPrice
    const updateData: Prisma.UserUpdateInput = {
      username: normalizedUsername,
      displayName: username.trim(), // Preserve original casing for display
      hasCompletedOnboarding: true,
    };

    // Only update avatar if provided
    if (image && typeof image === 'string' && image.trim()) {
      updateData.avatar = image.trim();
    }

    // Use try/catch to handle unique constraint violation (race-safe)
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          walletAddress: true,
          avatar: true,
          greeting: true,
          subscriptionPrice: true,
          hasCompletedOnboarding: true,
        },
      });

      return NextResponse.json({ user: updatedUser });
    } catch (error) {
      // Handle unique constraint violation (username already taken)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return NextResponse.json(
            { error: 'Username is already taken' },
            { status: 400 }
          );
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
