import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Admin endpoint to clean up stale streams
// Protected with ADMIN_API_KEY environment variable
export async function POST(req: NextRequest) {
  // Verify admin API key
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

  try {
    // Clean up all active streams
    const result = await prisma.stream.updateMany({
      where: {
        isLive: true,
      },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.count} stale streams`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error cleaning up streams:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup streams' },
      { status: 500 }
    );
  }
}
