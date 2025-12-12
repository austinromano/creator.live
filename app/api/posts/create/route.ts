import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient, POSTS_BUCKET } from '@/lib/supabase';
import { nanoid } from 'nanoid';

// POST /api/posts/create - Create a new post with media upload
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

    // Get user to verify they exist and get wallet address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, walletAddress: true },
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
    const type = formData.get('type') as string || 'free';
    const title = formData.get('title') as string || null;
    const priceStr = formData.get('price') as string | null;
    // Support pre-uploaded media URL (for remote clip posting)
    const mediaUrl = formData.get('mediaUrl') as string | null;
    const thumbnailUrl = formData.get('thumbnailUrl') as string | null;
    const mediaType = formData.get('mediaType') as string | null; // 'video' or 'image'

    // Either file or mediaUrl must be provided
    if (!file && !mediaUrl) {
      return NextResponse.json(
        { error: 'No file uploaded or media URL provided' },
        { status: 400 }
      );
    }

    // Validate post type
    const validTypes = ['free', 'paid', 'locked'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid post type' },
        { status: 400 }
      );
    }

    // Parse and validate price for paid posts
    let price: number | null = null;
    if (type === 'paid') {
      if (!priceStr) {
        return NextResponse.json(
          { error: 'Price is required for paid posts' },
          { status: 400 }
        );
      }
      price = parseFloat(priceStr);
      if (isNaN(price) || price <= 0) {
        return NextResponse.json(
          { error: 'Invalid price' },
          { status: 400 }
        );
      }
    }

    let publicUrl: string;
    let finalThumbnailUrl: string | null = null;
    let isVideo: boolean;
    let isImage: boolean;

    if (mediaUrl) {
      // Using pre-uploaded media URL (from desktop clip recording)
      publicUrl = mediaUrl;
      finalThumbnailUrl = thumbnailUrl;
      isVideo = mediaType === 'video';
      isImage = mediaType === 'image';
    } else if (file) {
      // Validate file type
      isImage = file.type.startsWith('image/');
      isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        return NextResponse.json(
          { error: 'Invalid file type. Only images and videos are allowed.' },
          { status: 400 }
        );
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 50MB.' },
          { status: 400 }
        );
      }

      // Generate unique filename - sanitize the path
      const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (isImage ? 'jpg' : 'mp4');
      const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '');
      const fileName = `${sanitizedUserId}/${nanoid()}.${fileExt}`;

      // Upload to Supabase Storage
      const supabase = createServerSupabaseClient();
      const fileBuffer = await file.arrayBuffer();

      const { data: uploadData, error: uploadError } = await supabase.storage
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
      return NextResponse.json(
        { error: 'No file or media URL provided' },
        { status: 400 }
      );
    }

    // Create post in database
    const post = await prisma.post.create({
      data: {
        userId,
        type,
        title: title?.trim() || null,
        thumbnailUrl: isImage ? publicUrl : finalThumbnailUrl, // Use image as thumbnail, or uploaded thumbnail for videos
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

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
