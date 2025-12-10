import { NextRequest, NextResponse } from 'next/server';
import { requireAuthId, errorResponse } from '@/lib/api/middleware';
import { uploadFile, getFileFromFormData } from '@/lib/api/file-upload';

// POST /api/rooms/icon - Upload room icon
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthId();

    const formData = await request.formData();
    const file = await getFileFromFormData(formData, 'file');

    const { publicUrl } = await uploadFile({
      fileType: 'roomIcon',
      userId,
      file,
    });

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
