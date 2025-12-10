import { prisma } from '@/lib/prisma';
import { createRoute } from '@/lib/api/middleware';

export const GET = createRoute(
  async (_req, { userId }) => {
    if (!userId) {
      return { user: null };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        walletAddress: true,
        avatar: true,
        hasCompletedOnboarding: true,
        createdAt: true,
      },
    });

    return { user: user ?? null };
  },
  { auth: 'optional', authMode: 'id-only' }
);
