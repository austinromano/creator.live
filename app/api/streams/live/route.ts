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
            avatar: true,
            walletAddress: true,
            isAI: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // Transform to a format compatible with the frontend
    const streams = liveStreams.map((stream) => ({
      id: stream.id,
      odyseeStreamKey: stream.id, // Used for the live page link
      roomName: `user-${stream.userId}`, // User-based room name
      title: stream.title || `${stream.user.username}'s Live Stream`,
      isLive: stream.isLive,
      viewerCount: stream.viewerCount,
      startedAt: stream.startedAt,
      user: {
        id: stream.user.id,
        username: stream.user.username,
        avatar: stream.user.avatar,
        walletAddress: stream.user.walletAddress,
        isAI: stream.user.isAI,
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
