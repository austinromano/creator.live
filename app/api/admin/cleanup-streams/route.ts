import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Admin endpoint to clean up stale streams
// In development: no auth required
// In production: Protected with ADMIN_API_KEY environment variable
export async function POST(req: NextRequest) {
  // Skip auth in development for convenience
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey) {
      return NextResponse.json(
        { error: 'Admin API key not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    // First find all active streams to report what we're cleaning
    const activeStreams = await prisma.stream.findMany({
      where: {
        OR: [
          { status: 'LIVE' },
          { status: 'PREVIEW' },
          { isLive: true }
        ]
      },
      select: {
        id: true,
        userId: true,
        status: true,
        isLive: true,
      }
    });

    // Clean up all active streams (any with isLive=true)
    const result = await prisma.stream.updateMany({
      where: {
        isLive: true
      },
      data: {
        status: 'ENDED',
        isLive: false,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.count} stale streams`,
      count: result.count,
      streams: activeStreams,
    });
  } catch (error) {
    console.error('Error cleaning up streams:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup streams' },
      { status: 500 }
    );
  }
}

// GET to check active streams without ending them
export async function GET() {
  try {
    const activeStreams = await prisma.stream.findMany({
      where: {
        OR: [
          { status: 'LIVE' },
          { status: 'PREVIEW' },
          { isLive: true }
        ]
      },
      select: {
        id: true,
        userId: true,
        status: true,
        isLive: true,
        startedAt: true,
      }
    });

    return NextResponse.json({
      count: activeStreams.length,
      streams: activeStreams,
    });
  } catch (error) {
    console.error('Error fetching streams:', error);
    return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
  }
}
