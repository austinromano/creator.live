import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';
import { createRoute, NotFoundError } from '@/lib/api/middleware';
import { startStreamSchema } from '@/lib/validations';

export const POST = createRoute(
  async (_req, { userId }, body) => {
    console.log('[/api/stream/start] Starting stream for userId:', userId);

    // Auto-cleanup any stale streams for this user before starting a new one
    const cleaned = await prisma.stream.updateMany({
      where: {
        userId: userId!,
        isLive: true,
      },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
    });
    console.log('[/api/stream/start] Cleaned up stale streams:', cleaned.count);

    // Generate a unique stream key
    const streamKey = nanoid(32);

    // Create new stream record
    const stream = await prisma.stream.create({
      data: {
        userId: userId!,
        streamKey,
        title: body.title || 'Untitled Stream',
        category: body.category || null,
        isLive: true,
        startedAt: new Date(),
      },
    });
    console.log('[/api/stream/start] Created stream:', stream.id, 'isLive:', stream.isLive);

    // Generate user-based room name for LiveKit
    const roomName = `user-${userId}`;
    console.log('[/api/stream/start] Room name:', roomName);

    return {
      success: true,
      stream: {
        id: stream.id,
        streamKey: stream.streamKey,
        title: stream.title,
        isLive: stream.isLive,
        startedAt: stream.startedAt,
      },
      roomName,
    };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: startStreamSchema }
);
