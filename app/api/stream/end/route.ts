import { prisma } from '@/lib/prisma';
import { createRoute, NotFoundError, ForbiddenError } from '@/lib/api/middleware';
import { endStreamSchema } from '@/lib/validations';

export const POST = createRoute(
  async (_req, { userId }, body) => {
    const stream = await prisma.stream.findUnique({
      where: { id: body.streamId },
    });

    if (!stream) {
      throw new NotFoundError('Stream not found');
    }

    if (stream.userId !== userId) {
      throw new ForbiddenError('Unauthorized to end this stream');
    }

    const updatedStream = await prisma.stream.update({
      where: { id: body.streamId },
      data: {
        isLive: false,
        status: 'ENDED',
        endedAt: new Date(),
      },
    });

    return {
      success: true,
      stream: {
        id: updatedStream.id,
        isLive: updatedStream.isLive,
        endedAt: updatedStream.endedAt,
      },
    };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: endStreamSchema }
);
