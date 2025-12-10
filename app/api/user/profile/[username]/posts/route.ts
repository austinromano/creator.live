import { prisma } from '@/lib/prisma';
import { createRoute, NotFoundError, BadRequestError } from '@/lib/api/middleware';

export const GET = createRoute(
  async (_req, { params }) => {
    const username = params.username;

    if (!username) {
      throw new BadRequestError('Username is required');
    }

    const normalizedUsername = username.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const posts = await prisma.post.findMany({
      where: {
        userId: user.id,
        isPublished: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        thumbnailUrl: true,
        price: true,
        viewerCount: true,
        createdAt: true,
      },
    });

    return {
      posts: posts.map((post) => ({
        id: post.id,
        type: post.type as 'free' | 'paid' | 'locked' | 'replay',
        title: post.title,
        thumbnailUrl: post.thumbnailUrl,
        price: post.price,
        viewerCount: post.viewerCount,
        createdAt: post.createdAt,
      })),
    };
  }
);
