import { prisma } from '@/lib/prisma';
import { createRoute } from '@/lib/api/middleware';
import { updateProfileSchema } from '@/lib/validations';

export const PATCH = createRoute(
  async (_req, { userId }, body) => {
    const updatedUser = await prisma.user.update({
      where: { id: userId! },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.subscriptionPrice !== undefined && { subscriptionPrice: body.subscriptionPrice }),
        ...(body.subscriptionsEnabled !== undefined && { subscriptionsEnabled: body.subscriptionsEnabled }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        subscriptionPrice: true,
        subscriptionsEnabled: true,
      },
    });

    return { success: true, user: updatedUser };
  },
  { auth: 'required', authMode: 'id-only', bodySchema: updateProfileSchema }
);
