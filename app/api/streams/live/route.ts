import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TIME } from '@/lib/constants';
import { errorResponse } from '@/lib/api/middleware';
import type { Stream } from '@/lib/types/stream';

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
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    const now = Date.now();

    // Transform to Stream type compatible with frontend
    const streams: Stream[] = liveStreams.map((stream) => ({
      id: stream.id,
      roomName: `user-${stream.userId}`,
      title: stream.title || `${stream.user.username}'s Live Stream`,
      category: stream.category,
      isLive: stream.isLive,
      viewerCount: stream.viewerCount,
      startedAt: stream.startedAt?.toISOString() || null,
      thumbnail: stream.thumbnail,
      user: {
        id: stream.user.id,
        username: stream.user.username,
        displayName: stream.user.displayName,
        avatar: stream.user.avatar,
        walletAddress: stream.user.walletAddress,
        isAI: stream.user.isAI,
        isOnline: stream.user.lastSeenAt
          ? now - new Date(stream.user.lastSeenAt).getTime() < TIME.ONLINE_THRESHOLD
          : false,
      },
    }));

    return NextResponse.json({ streams });
  } catch (error) {
    return errorResponse(error);
  }
}
