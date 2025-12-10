import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient, POSTS_BUCKET } from '@/lib/supabase';
import { createRoute, NotFoundError, ForbiddenError, BadRequestError } from '@/lib/api/middleware';

export const DELETE = createRoute(
  async (_req, { userId, params }) => {
    const id = params.id;

    if (!id) {
      throw new BadRequestError('Post ID is required');
    }

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
      throw new NotFoundError('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    // Delete from Supabase Storage
    const supabase = createServerSupabaseClient();

    const extractFilePath = (url: string | null) => {
      if (!url) return null;
      const match = url.match(/\/posts\/(.+)$/);
      return match ? match[1] : null;
    };

    const contentPath = extractFilePath(post.contentUrl);
    const thumbnailPath = extractFilePath(post.thumbnailUrl);
    const filesToDelete = [contentPath, thumbnailPath].filter(Boolean) as string[];

    if (filesToDelete.length > 0) {
      await supabase.storage.from(POSTS_BUCKET).remove(filesToDelete);
    }

    await prisma.post.delete({ where: { id } });

    return { success: true };
  },
  { auth: 'required', authMode: 'id-only' }
);
