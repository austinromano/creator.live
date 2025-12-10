/**
 * Zod validation schemas for API routes
 */

import { z } from 'zod';

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// User schemas
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  subscriptionPrice: z.number().min(0).max(1000).optional(),
  subscriptionsEnabled: z.boolean().optional(),
});

export const onboardingSchema = z.object({
  username: usernameSchema,
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
});

// Stream schemas
export const streamCategorySchema = z.enum(['IRL', 'Gaming', 'Music']).nullable();

export const startStreamSchema = z.object({
  title: z.string().max(100).default('Untitled Stream'),
  category: streamCategorySchema.optional(),
});

export const streamInviteSchema = z.object({
  toUsername: usernameSchema,
  roomName: z.string().min(1),
});

// Post schemas
export const postTypeSchema = z.enum(['free', 'paid', 'locked', 'replay']);

export const createPostSchema = z.object({
  type: postTypeSchema.default('free'),
  title: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  thumbnailUrl: z.string().url().optional(),
  contentUrl: z.string().url().optional(),
  price: z.number().min(0).optional(),
});

// Auth schemas
export const phantomAuthSchema = z.object({
  publicKey: z.string().min(32).max(64),
  signature: z.string().min(64),
  message: z.string().min(1),
  username: z.string().optional(),
});

export const emailAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: usernameSchema.optional(),
  isSignup: z.enum(['true', 'false']).optional(),
});

// Interaction schemas
export const sparkSchema = z.object({
  postId: z.string().cuid(),
});

export const followSchema = z.object({
  targetUserId: z.string().cuid(),
});

export const tipSchema = z.object({
  streamId: z.string().cuid().optional(),
  toWallet: z.string().min(32).max(64),
  amountSol: z.number().positive(),
  txSignature: z.string().min(64),
  message: z.string().max(200).optional(),
});

// LiveKit schemas
export const livekitTokenSchema = z.object({
  roomName: z.string().min(1),
  participantName: z.string().min(1),
  isHost: z.boolean().default(false),
});

// Stream end schema
export const endStreamSchema = z.object({
  streamId: z.string().cuid(),
});

// File upload schemas
export const imageUploadSchema = z.object({
  image: z.string().refine(
    (val) => val.startsWith('data:image/'),
    'Invalid image data URL'
  ),
});

// Helper function to validate request body
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json();
  return schema.parse(body);
}

// Helper function to validate query params
export function validateQuery<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const params = Object.fromEntries(searchParams.entries());
  return schema.parse(params);
}
