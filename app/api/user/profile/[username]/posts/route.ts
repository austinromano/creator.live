import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/user/profile/[username]/posts - Get user's posts
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Normalize username to lowercase for lookup
    const normalizedUsername = username.toLowerCase();

    // Find user first
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's posts
    const posts = await prisma.post.findMany({
      where: {
        userId: user.id,
        isPublished: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
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

    // Format posts for the content grid
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      type: post.type as 'free' | 'paid' | 'locked' | 'replay',
      title: post.title,
      thumbnailUrl: post.thumbnailUrl,
      price: post.price,
      viewerCount: post.viewerCount,
      createdAt: post.createdAt,
    }));

    return NextResponse.json({ posts: formattedPosts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
