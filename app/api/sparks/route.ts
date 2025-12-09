import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/sparks - Spark a post (like)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Get the post to find the owner
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if already sparked
    const existingSpark = await prisma.spark.findUnique({
      where: {
        userId_postId: {
          userId: currentUserId,
          postId,
        },
      },
    });

    if (existingSpark) {
      return NextResponse.json({ error: 'Already sparked' }, { status: 400 });
    }

    // Create spark and notification in a transaction
    await prisma.$transaction(async (tx) => {
      // Create the spark
      await tx.spark.create({
        data: {
          userId: currentUserId,
          postId,
        },
      });

      // Update post spark count
      await tx.post.update({
        where: { id: postId },
        data: { viewerCount: { increment: 1 } },
      });

      // Create notification (only if not sparking your own post)
      if (post.userId !== currentUserId) {
        await tx.notification.create({
          data: {
            userId: post.userId,
            fromUserId: currentUserId,
            type: 'spark',
            postId,
          },
        });
      }
    });

    return NextResponse.json({ success: true, sparked: true });
  } catch (error) {
    console.error('Error sparking post:', error);
    return NextResponse.json({ error: 'Failed to spark post' }, { status: 500 });
  }
}

// DELETE /api/sparks - Unspark a post (unlike)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Get the post to find the owner
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Delete spark and notification in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete the spark
      await tx.spark.deleteMany({
        where: {
          userId: currentUserId,
          postId,
        },
      });

      // Decrement post spark count (don't go below 0)
      await tx.post.update({
        where: { id: postId },
        data: { viewerCount: { decrement: 1 } },
      });

      // Remove the notification
      await tx.notification.deleteMany({
        where: {
          userId: post.userId,
          fromUserId: currentUserId,
          type: 'spark',
          postId,
        },
      });
    });

    return NextResponse.json({ success: true, sparked: false });
  } catch (error) {
    console.error('Error unsparking post:', error);
    return NextResponse.json({ error: 'Failed to unspark post' }, { status: 500 });
  }
}
