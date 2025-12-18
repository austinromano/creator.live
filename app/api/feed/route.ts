import { prisma } from '@/lib/prisma';
import { createRoute } from '@/lib/api/middleware';

export const GET = createRoute(
  async (_req, { userId }) => {
    // Get all user IDs that the current user follows
    const following = await prisma.follower.findMany({
      where: { followerId: userId! },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    // Include current user's own posts in feed
    const userIdsForFeed = [...followingIds, userId!];

    // Get posts from followed users AND own posts in chronological order (newest first)
    // Own posts show regardless of type, but followed users' paid/locked posts are hidden
    const posts = await prisma.post.findMany({
      where: {
        isPublished: true,
        OR: [
          // User's own posts - show all types
          { userId: userId! },
          // Followed users' posts - only free/replay types
          {
            userId: { in: followingIds },
            type: { notIn: ['paid', 'locked'] },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            displayName: true,
            isVerified: true,
          },
        },
        sparks: {
          where: { userId: userId! },
          select: { id: true },
        },
        _count: {
          select: { sparks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Transform the data
    const feedPosts = posts.map((post) => ({
      id: post.id,
      type: post.type,
      title: post.title,
      description: post.description,
      thumbnailUrl: post.thumbnailUrl,
      contentUrl: post.contentUrl,
      price: post.price,
      sparkCount: post._count.sparks,
      sparked: post.sparks.length > 0,
      createdAt: post.createdAt,
      user: {
        id: post.user.id,
        username: post.user.username,
        displayName: post.user.displayName || post.user.username,
        avatar: post.user.avatar,
        isVerified: post.user.isVerified,
      },
    }));

    return { posts: feedPosts };
  },
  { auth: 'required', authMode: 'id-only' }
);
