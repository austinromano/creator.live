import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { title, category } = await req.json();

    // Auto-cleanup any stale streams for this user before starting a new one
    // This handles cases where the browser was closed without properly ending the stream
    await prisma.stream.updateMany({
      where: {
        userId: (session.user as any).id,
        isLive: true,
      },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
    });

    // Generate a unique stream key
    const streamKey = nanoid(32);

    // Create new stream record
    const stream = await prisma.stream.create({
      data: {
        userId: (session.user as any).id,
        streamKey,
        title: title || 'Untitled Stream',
        category: category || null,
        isLive: true,
        startedAt: new Date(),
      },
    });

    // Generate user-based room name for LiveKit
    const roomName = `user-${(session.user as any).id}`;

    return NextResponse.json({
      success: true,
      stream: {
        id: stream.id,
        streamKey: stream.streamKey,
        title: stream.title,
        isLive: stream.isLive,
        startedAt: stream.startedAt,
      },
      roomName, // User-based room name for LiveKit
    });
  } catch (error) {
    console.error('Error starting stream:', error);
    return NextResponse.json(
      { error: 'Failed to start stream' },
      { status: 500 }
    );
  }
}
