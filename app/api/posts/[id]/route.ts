import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient, POSTS_BUCKET } from '@/lib/supabase';

// DELETE /api/posts/[id] - Delete a post
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Find the post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        contentUrl: true,
        thumbnailUrl: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if the user owns this post
    if (post.userId !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    // Delete from Supabase Storage
    const supabase = createServerSupabaseClient();

    // Extract file path from URL
    const extractFilePath = (url: string | null) => {
      if (!url) return null;
      const match = url.match(/\/posts\/(.+)$/);
      return match ? match[1] : null;
    };

    const contentPath = extractFilePath(post.contentUrl);
    const thumbnailPath = extractFilePath(post.thumbnailUrl);

    const filesToDelete = [contentPath, thumbnailPath].filter(Boolean) as string[];

    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(POSTS_BUCKET)
        .remove(filesToDelete);

      if (storageError) {
        console.error('Error deleting files from storage:', storageError);
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
