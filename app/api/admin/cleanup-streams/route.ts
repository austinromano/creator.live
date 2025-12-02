import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Admin endpoint to clean up stale streams
// In production, this should be protected with an admin key
export async function POST(req: NextRequest) {
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
