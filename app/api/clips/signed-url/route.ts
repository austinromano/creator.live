import { NextRequest } from 'next/server';
import { createServerSupabaseClient, POSTS_BUCKET } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import {
  requireAuthId,
  errorResponse,
  successResponse,
  BadRequestError,
} from '@/lib/api/middleware';

// POST /api/clips/signed-url - Get a signed URL for direct upload to Supabase
// This bypasses Vercel's 4.5MB body limit by letting the client upload directly
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthId();

    const body = await request.json();
    const { fileType, fileSize } = body;

    if (!fileType || !fileType.startsWith('video/')) {
      throw new BadRequestError('Invalid file type. Only videos are allowed.');
    }

    // Validate file size (100MB max for clips)
    if (fileSize && fileSize > 100 * 1024 * 1024) {
      throw new BadRequestError('File too large. Maximum size is 100MB.');
    }

    // Generate unique filename
    const fileExt = fileType === 'video/webm' ? 'webm' :
                    fileType === 'video/mp4' ? 'mp4' : 'webm';
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '');
    const fileName = `${sanitizedUserId}/clips/${nanoid()}.${fileExt}`;

    // Create signed upload URL (valid for 10 minutes)
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.storage
      .from(POSTS_BUCKET)
      .createSignedUploadUrl(fileName);

    if (error) {
      console.error('[SignedURL] Supabase error:', error);
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    // Get the public URL for after upload
    const { data: { publicUrl } } = supabase.storage
      .from(POSTS_BUCKET)
      .getPublicUrl(fileName);

    console.log(`[SignedURL] Created for ${fileName}, size: ${fileSize} bytes`);

    return successResponse({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl,
      fileName,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
