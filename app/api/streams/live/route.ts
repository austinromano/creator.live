import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/streams/live - Get all currently live streams
export async function GET(request: NextRequest) {
  try {
    const liveStreams = await prisma.stream.findMany({
      where: {
        isLive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            walletAddress: true,
            isAI: true,
            lastSeenAt: true,
            age: true,
            location: true,
            lookingFor: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // Check if user is online (lastSeenAt within 2 minutes)
    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
    const now = Date.now();

    // Transform to a format compatible with the frontend
    const streams = liveStreams.map((stream) => ({
      id: stream.id,
      odyseeStreamKey: stream.id, // Used for the live page link
      roomName: `user-${stream.userId}`, // User-based room name
      title: stream.title || `${stream.user.username}'s Live Stream`,
      isLive: stream.isLive,
      viewerCount: stream.viewerCount,
      startedAt: stream.startedAt,
      thumbnail: stream.thumbnail, // Include thumbnail in response
      user: {
        id: stream.user.id,
        username: stream.user.username,
        displayName: stream.user.displayName,
        avatar: stream.user.avatar,
        walletAddress: stream.user.walletAddress,
        isAI: stream.user.isAI,
        isOnline: stream.user.lastSeenAt
          ? now - new Date(stream.user.lastSeenAt).getTime() < ONLINE_THRESHOLD_MS
          : false,
        age: stream.user.age,
        location: stream.user.location,
        lookingFor: stream.user.lookingFor,
      },
    }));

    return NextResponse.json({ streams });
  } catch (error) {
    console.error('Error fetching live streams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live streams' },
      { status: 500 }
    );
  }
}
