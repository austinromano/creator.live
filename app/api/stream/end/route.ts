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

    const { streamId } = await req.json();

    if (!streamId) {
      return NextResponse.json(
        { error: 'Stream ID is required' },
        { status: 400 }
      );
    }

    // Find the stream and verify ownership
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    if (stream.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: 'Unauthorized to end this stream' },
        { status: 403 }
      );
    }

    // Update stream to mark it as ended
    const updatedStream = await prisma.stream.update({
      where: { id: streamId },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      stream: {
        id: updatedStream.id,
        isLive: updatedStream.isLive,
        endedAt: updatedStream.endedAt,
      },
    });
  } catch (error) {
    console.error('Error ending stream:', error);
    return NextResponse.json(
      { error: 'Failed to end stream' },
      { status: 500 }
    );
  }
}
