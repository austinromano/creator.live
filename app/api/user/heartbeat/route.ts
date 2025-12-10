import { prisma } from '@/lib/prisma';
import { createRoute } from '@/lib/api/middleware';

export const POST = createRoute(
  async (_req, { userId }) => {
    await prisma.user.update({
      where: { id: userId! },
      data: { lastSeenAt: new Date() },
    });

    return { success: true };
  },
  { auth: 'required', authMode: 'id-only' }
);
