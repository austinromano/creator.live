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
        lastSeenAt: true,
        createdAt: true,
        // Dating fields
        datingEnabled: true,
        lookingFor: true,
        relationshipStatus: true,
        interests: true,
        age: true,
        gender: true,
        location: true,
        datingBio: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            streams: true,
          },
        },
        // Get active live stream if any
        streams: {
          where: {
            isLive: true,
          },
          select: {
            id: true,
            streamKey: true,
            title: true,
            viewerCount: true,
            startedAt: true,
          },
          take: 1,
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

    // Check if user has an active live stream
    const liveStream = user.streams.length > 0 ? user.streams[0] : null;

    // Check if user is online (lastSeenAt within 2 minutes)
    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const now = Date.now();
    const isOnline = user.lastSeenAt
      ? (now - new Date(user.lastSeenAt).getTime()) < ONLINE_THRESHOLD_MS
      : false;

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
      isOnline,
      isLive: !!liveStream,
      liveStream: liveStream ? {
        id: liveStream.id,
        roomName: `user-${user.id}`,
        title: liveStream.title,
        viewerCount: liveStream.viewerCount,
        startedAt: liveStream.startedAt,
      } : null,
      stats: {
        posts: user._count.posts,
        followers: user._count.followers,
        following: user._count.following,
        streams: user._count.streams,
        earnings: tipsReceived._sum.amountSol || 0,
      },
      // Dating fields
      datingEnabled: user.datingEnabled,
      lookingFor: user.lookingFor,
      relationshipStatus: user.relationshipStatus,
      interests: user.interests,
      age: user.age,
      gender: user.gender,
      location: user.location,
      datingBio: user.datingBio,
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
