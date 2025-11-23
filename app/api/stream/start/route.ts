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

    const { title } = await req.json();

    // Check if user already has an active stream
    const existingStream = await prisma.stream.findFirst({
      where: {
        userId: (session.user as any).id,
        isLive: true,
      },
    });

    if (existingStream) {
      return NextResponse.json(
        { error: 'You already have an active stream' },
        { status: 400 }
      );
    }

    // Generate a unique stream key
    const streamKey = nanoid(32);

    // Create new stream record
    const stream = await prisma.stream.create({
      data: {
        userId: (session.user as any).id,
        streamKey,
        title: title || 'Untitled Stream',
        isLive: true,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      stream: {
        id: stream.id,
        streamKey: stream.streamKey,
        title: stream.title,
        isLive: stream.isLive,
        startedAt: stream.startedAt,
      },
    });
  } catch (error) {
    console.error('Error starting stream:', error);
    return NextResponse.json(
      { error: 'Failed to start stream' },
      { status: 500 }
    );
  }
}
