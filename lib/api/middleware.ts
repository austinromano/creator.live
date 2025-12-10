/**
 * API middleware utilities
 * Shared authentication and request handling for API routes
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Custom error types for better handling
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

// Session user type from next-auth
interface SessionUser {
  id?: string;
  email?: string;
  walletAddress?: string;
  name?: string;
  image?: string;
}

// Authenticated user with database record
export interface AuthenticatedUser {
  id: string;
  email: string | null;
  walletAddress: string | null;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
}

/**
 * Get authenticated user from session
 * Throws UnauthorizedError if not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUser | undefined;

  if (!sessionUser?.email && !sessionUser?.walletAddress && !sessionUser?.id) {
    throw new UnauthorizedError();
  }

  // Find user in database
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(sessionUser.id ? [{ id: sessionUser.id }] : []),
        ...(sessionUser.email ? [{ email: sessionUser.email }] : []),
        ...(sessionUser.walletAddress ? [{ walletAddress: sessionUser.walletAddress }] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      walletAddress: true,
      username: true,
      displayName: true,
      avatar: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

/**
 * Get authenticated user ID only (faster, no DB lookup)
 * Throws UnauthorizedError if not authenticated
 */
export async function requireAuthId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUser | undefined;

  const userId = sessionUser?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
}

/**
 * Optional auth - returns user or null
 */
export async function getOptionalAuth(): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
}

/**
 * Standard error response handler
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

/**
 * Standard success response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<NextResponse> {
  return handler()
    .then((result) => NextResponse.json(result))
    .catch((error) => errorResponse(error));
}
