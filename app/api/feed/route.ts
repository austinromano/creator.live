import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/feed - Get posts from users you follow in chronological order
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user IDs that the current user follows
    const following = await prisma.follower.findMany({
      where: {
        followerId: currentUserId,
      },
      select: {
        followingId: true,
      },
    });

    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return NextResponse.json({ posts: [] });
    }

    // Get posts from followed users in chronological order (newest first)
    // Exclude paid and locked posts from the feed
    const posts = await prisma.post.findMany({
      where: {
        userId: {
          in: followingIds,
        },
        isPublished: true,
        type: {
          notIn: ['paid', 'locked'],
        },
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
          where: {
            userId: currentUserId,
          },
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            sparks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to 50 posts for now
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
      sparked: post.sparks.length > 0, // Current user has sparked this post
      createdAt: post.createdAt,
      user: {
        id: post.user.id,
        username: post.user.username,
        displayName: post.user.displayName || post.user.username,
        avatar: post.user.avatar,
        isVerified: post.user.isVerified,
      },
    }));

    return NextResponse.json({ posts: feedPosts });
  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
  }
}
