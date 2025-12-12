import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient, POSTS_BUCKET } from '@/lib/supabase';
import { nanoid } from 'nanoid';

// POST /api/clips/upload - Upload a clip and return URLs (without creating a post)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const thumbnail = formData.get('thumbnail') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type (video only for clips)
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only videos are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (100MB max for clips)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
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
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
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

    return NextResponse.json({
      mediaUrl,
      thumbnailUrl,
      mediaType: 'video',
    });
  } catch (error) {
    console.error('Error uploading clip:', error);
    return NextResponse.json(
      { error: 'Failed to upload clip' },
      { status: 500 }
    );
  }
}
