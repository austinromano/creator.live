import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // End all active streams for this user
    const result = await prisma.stream.updateMany({
      where: {
        userId: (session.user as any).id,
        isLive: true,
      },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.count} active streams`,
    });
  } catch (error) {
    console.error('Error cleaning up streams:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup streams' },
      { status: 500 }
    );
  }
}
