import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get all currently live streams with user information
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
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      streams: liveStreams.map(stream => ({
        id: stream.id,
        title: stream.title,
        streamKey: stream.streamKey,
        viewerCount: stream.viewerCount,
        startedAt: stream.startedAt,
        user: {
          id: stream.user.id,
          username: stream.user.username,
          avatar: stream.user.avatar,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching live streams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live streams' },
      { status: 500 }
    );
  }
}
