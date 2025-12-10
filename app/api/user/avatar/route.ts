import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse } from '@/lib/api/middleware';
import { uploadFile, getFileFromFormData } from '@/lib/api/file-upload';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();
    const file = await getFileFromFormData(formData);

    const { publicUrl } = await uploadFile({
      fileType: 'avatar',
      userId: user.id,
      file,
    });

    // Update user's avatar in database
    await prisma.user.update({
      where: { id: user.id },
      data: { avatar: publicUrl },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: publicUrl,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
