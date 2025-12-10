/**
 * File upload utilities
 * Shared logic for handling file uploads to Supabase storage
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import { BadRequestError, ApiError } from './middleware';

// File type configurations
export const FILE_CONFIGS = {
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/'],
    folder: 'avatars',
    bucket: 'posts',
  },
  cover: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/'],
    folder: 'covers',
    bucket: 'posts',
  },
  post: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/', 'video/'],
    folder: 'posts',
    bucket: 'posts',
  },
} as const;

export type FileType = keyof typeof FILE_CONFIGS;

interface UploadOptions {
  fileType: FileType;
  userId: string;
  file: File;
}

interface UploadResult {
  publicUrl: string;
  fileName: string;
}

/**
 * Validate a file against type and size constraints
 */
export function validateFile(file: File, fileType: FileType): void {
  const config = FILE_CONFIGS[fileType];

  // Check file type
  const isValidType = config.allowedTypes.some((type) =>
    file.type.startsWith(type)
  );
  if (!isValidType) {
    const allowedDesc = config.allowedTypes
      .map((t) => t.replace('/', ''))
      .join(' or ');
    throw new BadRequestError(`Only ${allowedDesc} files are allowed`);
  }

  // Check file size
  if (file.size > config.maxSize) {
    const maxSizeMB = config.maxSize / (1024 * 1024);
    throw new BadRequestError(`File size must be under ${maxSizeMB}MB`);
  }
}

/**
 * Upload a file to Supabase storage
 */
export async function uploadFile({
  fileType,
  userId,
  file,
}: UploadOptions): Promise<UploadResult> {
  const config = FILE_CONFIGS[fileType];

  // Validate file
  validateFile(file, fileType);

  // Generate safe file path
  const fileExt =
    file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '');
  const fileName = `${config.folder}/${sanitizedUserId}/${nanoid()}.${fileExt}`;

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase
  const supabase = createServerSupabaseClient();
  const { error: uploadError } = await supabase.storage
    .from(config.bucket)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    throw new ApiError('Failed to upload file', 500);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(config.bucket).getPublicUrl(fileName);

  return { publicUrl, fileName };
}

/**
 * Extract file from form data with validation
 */
export async function getFileFromFormData(
  formData: FormData,
  fieldName: string = 'file'
): Promise<File> {
  const file = formData.get(fieldName) as File | null;

  if (!file) {
    throw new BadRequestError('No file provided');
  }

  return file;
}
