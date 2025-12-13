import { NextRequest } from 'next/server';
import { z } from 'zod';
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

// Validation schema for post creation form data
const postFormSchema = z.object({
  type: z.enum(['free', 'paid', 'locked']).default('free'),
  title: z.string().max(100).nullable().optional(),
  price: z.string().nullable().optional(),
  mediaUrl: z.string().url().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  mediaType: z.enum(['video', 'image']).nullable().optional(),
});

// POST /api/posts/create - Create a new post with media upload
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthId();

    // Get user to verify they exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, walletAddress: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const thumbnail = formData.get('thumbnail') as File | null;

    // Extract and validate form fields
    const formFields = postFormSchema.parse({
      type: formData.get('type') || 'free',
      title: formData.get('title'),
      price: formData.get('price'),
      mediaUrl: formData.get('mediaUrl'),
      thumbnailUrl: formData.get('thumbnailUrl'),
      mediaType: formData.get('mediaType'),
    });

    const { type, title, mediaUrl, thumbnailUrl: preUploadedThumbUrl, mediaType } = formFields;

    // Either file or mediaUrl must be provided
    if (!file && !mediaUrl) {
      throw new BadRequestError('No file uploaded or media URL provided');
    }

    // Parse and validate price for paid posts
    let price: number | null = null;
    if (type === 'paid') {
      if (!formFields.price) {
        throw new BadRequestError('Price is required for paid posts');
      }
      price = parseFloat(formFields.price);
      if (isNaN(price) || price <= 0) {
        throw new BadRequestError('Invalid price');
      }
    }

    let publicUrl: string;
    let finalThumbnailUrl: string | null = null;
    let isVideo: boolean;
    let isImage: boolean;

    if (mediaUrl) {
      // Using pre-uploaded media URL (from desktop clip recording)
      publicUrl = mediaUrl;
      finalThumbnailUrl = preUploadedThumbUrl ?? null;
      isVideo = mediaType === 'video';
      isImage = mediaType === 'image';
    } else if (file) {
      // Validate file type
      isImage = file.type.startsWith('image/');
      isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        throw new BadRequestError('Invalid file type. Only images and videos are allowed.');
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        throw new BadRequestError('File too large. Maximum size is 50MB.');
      }

      // Generate unique filename - sanitize the path
      const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (isImage ? 'jpg' : 'mp4');
      const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '');
      const fileName = `${sanitizedUserId}/${nanoid()}.${fileExt}`;

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
      const { data: { publicUrl: uploadedUrl } } = supabase.storage
        .from(POSTS_BUCKET)
        .getPublicUrl(fileName);
      publicUrl = uploadedUrl;

      // Upload thumbnail if provided (for videos)
      if (isVideo && thumbnail) {
        const thumbFileName = `${sanitizedUserId}/${nanoid()}_thumb.jpg`;
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
          finalThumbnailUrl = thumbPublicUrl;
        }
      }
    } else {
      throw new BadRequestError('No file or media URL provided');
    }

    // Create post in database
    const post = await prisma.post.create({
      data: {
        userId,
        type,
        title: title?.trim() || null,
        thumbnailUrl: isImage ? publicUrl : finalThumbnailUrl,
        contentUrl: publicUrl,
        price,
        isPublished: true,
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

    return successResponse({ post });
  } catch (error) {
    return errorResponse(error);
  }
}
