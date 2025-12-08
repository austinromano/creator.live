import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/user/profile/[username] - Get user profile by username
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Normalize username to lowercase for lookup
    const normalizedUsername = username.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        coverImage: true,
        bio: true,
        greeting: true,
        subscriptionPrice: true,
        subscriptionsEnabled: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            streams: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get total tips received (earnings)
    const tipsReceived = await prisma.tip.aggregate({
      where: {
        toWallet: user.id, // This should be wallet address, but we need to handle both cases
      },
      _sum: {
        amountSol: true,
      },
    });

    // Format response
    const profile = {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar,
      coverImage: user.coverImage,
      bio: user.bio,
      greeting: user.greeting,
      subscriptionPrice: user.subscriptionPrice,
      subscriptionsEnabled: user.subscriptionsEnabled,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      stats: {
        posts: user._count.posts,
        followers: user._count.followers,
        following: user._count.following,
        streams: user._count.streams,
        earnings: tipsReceived._sum.amountSol || 0,
      },
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
