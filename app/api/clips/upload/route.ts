import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient, POSTS_BUCKET } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import {
  requireAuthId,
  errorResponse,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '@/lib/api/middleware';

// POST /api/clips/upload - Upload a clip and return URLs (without creating a post)
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthId();

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const thumbnail = formData.get('thumbnail') as File | null;

    if (!file) {
      throw new BadRequestError('No file uploaded');
    }

    // Validate file type (video only for clips)
    if (!file.type.startsWith('video/')) {
      throw new BadRequestError('Invalid file type. Only videos are allowed.');
    }

    // Validate file size (100MB max for clips)
    if (file.size > 100 * 1024 * 1024) {
      throw new BadRequestError('File too large. Maximum size is 100MB.');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webm';
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '');
    const fileName = `${sanitizedUserId}/clips/${nanoid()}.${fileExt}`;

    // Upload to Supabase Storage
    const supabase = createServerSupabaseClient();
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(POSTS_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl: mediaUrl } } = supabase.storage
      .from(POSTS_BUCKET)
      .getPublicUrl(fileName);

    // Upload thumbnail if provided
    let thumbnailUrl: string | null = null;
    if (thumbnail) {
      const thumbFileName = `${sanitizedUserId}/clips/${nanoid()}_thumb.jpg`;
      const thumbBuffer = await thumbnail.arrayBuffer();

      const { error: thumbError } = await supabase.storage
        .from(POSTS_BUCKET)
        .upload(thumbFileName, thumbBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (!thumbError) {
        const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
          .from(POSTS_BUCKET)
          .getPublicUrl(thumbFileName);
        thumbnailUrl = thumbPublicUrl;
      }
    }

    return successResponse({
      mediaUrl,
      thumbnailUrl,
      mediaType: 'video',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
