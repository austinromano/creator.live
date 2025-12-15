import { prisma } from '@/lib/prisma';
import {
  createRoute,
  successResponse,
} from '@/lib/api/middleware';

// POST /api/stream/cleanup - End all active streams for the current user
// This ends both PREVIEW and LIVE streams
export const POST = createRoute(
  async (_req, { userId }) => {
    const result = await prisma.stream.updateMany({
      where: {
        userId,
        status: { in: ['PREVIEW', 'LIVE'] },
      },
      data: {
        status: 'ENDED',
        isLive: false,
        endedAt: new Date(),
      },
    });

    return successResponse({
      success: true,
      message: `Cleaned up ${result.count} active streams`,
    });
  },
  { auth: 'required', authMode: 'id-only' }
);
