import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';
import { createRoute, ApiError } from '@/lib/api/middleware';

// Start a preview session - stream is connected to LiveKit but not visible to viewers
export const POST = createRoute(
  async (_req, { userId }) => {
    // KILL SWITCH
    if (process.env.LIVEKIT_DISABLED === 'true') {
      throw new ApiError('Streaming temporarily disabled', 503, 'LIVEKIT_DISABLED');
    }

    console.log('[/api/stream/preview] Starting preview for userId:', userId);

    // Check if user already has a PREVIEW stream
    let stream = await prisma.stream.findFirst({
      where: {
        userId: userId!,
        status: 'PREVIEW',
      },
    });

    if (stream) {
      console.log('[/api/stream/preview] Reusing existing PREVIEW stream:', stream.id);
    } else {
      // Clean up any stale LIVE streams before creating preview
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

      // Generate a unique stream key
      const streamKey = nanoid(32);

      // Create new stream in PREVIEW state
      stream = await prisma.stream.create({
        data: {
          userId: userId!,
          streamKey,
          status: 'PREVIEW',
          isLive: false, // NOT live yet - only visible to creator
          startedAt: new Date(),
        },
      });
      console.log('[/api/stream/preview] Created PREVIEW stream:', stream.id);
    }

    // Generate user-based room name for LiveKit
    const roomName = `user-${userId}`;
    console.log('[/api/stream/preview] Room name:', roomName);

    return {
      success: true,
      stream: {
        id: stream.id,
        streamKey: stream.streamKey,
        status: stream.status,
      },
      roomName,
    };
  },
  { auth: 'required', authMode: 'id-only' }
);
