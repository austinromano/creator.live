import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createRoute, BadRequestError, ConflictError } from '@/lib/api/middleware';

const RESERVED_USERNAMES = [
  'admin', 'support', 'help', 'api', 'www', 'app', 'mail',
  'official', 'osho', 'system', 'mod', 'moderator', 'staff',
  'null', 'undefined', 'anonymous', 'user', 'guest', 'test',
];

const onboardingSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be 20 characters or less')
    .regex(/^[a-z][a-z0-9_]*$/, 'Username must start with a letter and contain only letters, numbers, and underscores')
    .transform(val => val.toLowerCase())
    .refine(val => !RESERVED_USERNAMES.includes(val), 'This username is not available'),
  image: z.string().url().optional(),
});

export const POST = createRoute(
  async (_req, { userId }, body) => {
    const updateData: Prisma.UserUpdateInput = {
      username: body.username,
      displayName: body.username,
      hasCompletedOnboarding: true,
    };

    if (body.image) {
      updateData.avatar = body.image;
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId! },
        data: updateData,
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          walletAddress: true,
          avatar: true,
          greeting: true,
          subscriptionPrice: true,
          hasCompletedOnboarding: true,
        },
      });

      return { user: updatedUser };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('Username is already taken');
      }
      throw error;
    }
  },
  { auth: 'required', authMode: 'id-only', bodySchema: onboardingSchema }
);
