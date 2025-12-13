import { NextRequest } from 'next/server';
import { createServerSupabaseClient, POSTS_BUCKET } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import {
  requireAuthId,
  errorResponse,
  successResponse,
  BadRequestError,
} from '@/lib/api/middleware';

// POST /api/clips/upload-thumbnail - Upload just the thumbnail (small file, under 4.5MB)
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthId();

    const formData = await request.formData();
    const thumbnail = formData.get('thumbnail') as File | null;

    if (!thumbnail) {
      throw new BadRequestError('No thumbnail uploaded');
    }

    // Validate it's an image
    if (!thumbnail.type.startsWith('image/')) {
      throw new BadRequestError('Invalid file type. Only images are allowed.');
    }

    // Generate unique filename
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '');
    const thumbFileName = `${sanitizedUserId}/clips/${nanoid()}_thumb.jpg`;

    // Upload to Supabase
    const supabase = createServerSupabaseClient();
    const thumbBuffer = await thumbnail.arrayBuffer();

    const { error: thumbError } = await supabase.storage
      .from(POSTS_BUCKET)
      .upload(thumbFileName, thumbBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (thumbError) {
      console.error('[Thumbnail] Upload error:', thumbError);
      throw new Error(`Failed to upload thumbnail: ${thumbError.message}`);
    }

    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from(POSTS_BUCKET)
      .getPublicUrl(thumbFileName);

    console.log('[Thumbnail] Uploaded:', thumbnailUrl);

    return successResponse({ thumbnailUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
