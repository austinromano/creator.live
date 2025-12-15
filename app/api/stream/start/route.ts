import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';
import { createRoute } from '@/lib/api/middleware';
import { startStreamSchema } from '@/lib/validations';

// Go Live - flips PREVIEW stream to LIVE (or creates new LIVE stream if no preview)
export const POST = createRoute(
  async (_req, { userId }, body) => {
    console.log('[/api/stream/start] Going LIVE for userId:', userId);

    // Check if user has an existing PREVIEW stream to flip
    let stream = await prisma.stream.findFirst({
      where: {
        userId: userId!,
        status: 'PREVIEW',
      },
    });

    const roomName = `user-${userId}`;

    if (stream) {
      // Flip PREVIEW -> LIVE (same LiveKit session continues)
      console.log('[/api/stream/start] Flipping PREVIEW stream to LIVE:', stream.id);
      stream = await prisma.stream.update({
        where: { id: stream.id },
        data: {
          status: 'LIVE',
          isLive: true, // For backward compatibility
          title: body.title || stream.title || 'Untitled Stream',
          category: body.category || stream.category,
          startedAt: stream.startedAt || new Date(),
        },
      });
      console.log('[/api/stream/start] Stream is now LIVE:', stream.id);
    } else {
      // No preview stream - create directly as LIVE (fallback for direct go-live)
      console.log('[/api/stream/start] No PREVIEW stream found, creating new LIVE stream');

      // Clean up any stale streams first
      await prisma.stream.updateMany({
        where: {
          userId: userId!,
          status: { in: ['LIVE', 'PREVIEW'] },
        },
        data: {
          status: 'ENDED',
          isLive: false,
          endedAt: new Date(),
        },
      });

      const streamKey = nanoid(32);
      stream = await prisma.stream.create({
        data: {
          userId: userId!,
          streamKey,
          title: body.title || 'Untitled Stream',
          category: body.category || null,
          status: 'LIVE',
          isLive: true,
          startedAt: new Date(),
        },
      });
      console.log('[/api/stream/start] Created new LIVE stream:', stream.id);
    }

    return {
      success: true,
      stream: {
        id: stream.id,
        streamKey: stream.streamKey,
        title: stream.title,
        status: stream.status,
        isLive: stream.isLive,
        startedAt: stream.startedAt,
      },
      roomName,
    };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: startStreamSchema }
);
