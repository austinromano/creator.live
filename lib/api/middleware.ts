/**
 * API middleware utilities
 * Shared authentication, validation, and request handling for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ZodError, ZodType } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// Error Classes
// ============================================================================

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

export class ValidationError extends ApiError {
  constructor(
    message: string = 'Validation failed',
    public errors: Record<string, string[]> = {}
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  walletAddress: string | null;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
}

export interface RouteContext<TParams = Record<string, string>> {
  params: TParams;
  user?: AuthenticatedUser;
  userId?: string;
}

type RouteHandler<TBody = unknown, TParams = Record<string, string>> = (
  request: NextRequest,
  context: RouteContext<TParams>,
  body: TBody
) => Promise<NextResponse | unknown>;

interface RouteOptions<TBody = unknown> {
  auth?: 'required' | 'optional' | 'none';
  authMode?: 'full' | 'id-only';
  bodySchema?: ZodType<TBody>;
}

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Get authenticated user from session with full database lookup
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user;

  if (!sessionUser?.id && !sessionUser?.email && !sessionUser?.walletAddress) {
    throw new UnauthorizedError();
  }

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
 */
export async function requireAuthId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

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
 * Optional auth ID - returns user ID or null
 */
export async function getOptionalAuthId(): Promise<string | null> {
  try {
    return await requireAuthId();
  } catch {
    return null;
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Standard error response handler
 */
export function errorResponse(error: unknown): NextResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || 'root';
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', errors },
      { status: 400 }
    );
  }

  // Custom API errors
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, code: error.code, errors: error.errors },
      { status: error.statusCode }
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  // Log unexpected errors in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unexpected API error:', error);
  }

  return NextResponse.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

/**
 * Standard success response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// ============================================================================
// Route Handler Wrapper
// ============================================================================

/**
 * Creates an API route handler with automatic error handling, auth, and validation
 *
 * @example
 * // Simple protected route
 * export const GET = createRoute(
 *   async (req, { user }) => {
 *     return { message: `Hello ${user.username}` };
 *   },
 *   { auth: 'required' }
 * );
 *
 * @example
 * // Route with body validation
 * export const POST = createRoute(
 *   async (req, { user }, body) => {
 *     return { created: body.title };
 *   },
 *   { auth: 'required', bodySchema: createPostSchema }
 * );
 */
export function createRoute<TBody = unknown, TParams = Record<string, string>>(
  handler: RouteHandler<TBody, TParams>,
  options: RouteOptions<TBody> = {}
): (request: NextRequest, segmentData?: { params?: Promise<TParams> }) => Promise<NextResponse> {
  const { auth = 'none', authMode = 'full', bodySchema } = options;

  return async (request: NextRequest, segmentData?: { params?: Promise<TParams> }): Promise<NextResponse> => {
    try {
      const context: RouteContext<TParams> = {
        params: segmentData?.params ? await segmentData.params : {} as TParams,
      };

      // Handle authentication
      if (auth === 'required') {
        if (authMode === 'id-only') {
          context.userId = await requireAuthId();
        } else {
          context.user = await requireAuth();
          context.userId = context.user.id;
        }
      } else if (auth === 'optional') {
        if (authMode === 'id-only') {
          context.userId = await getOptionalAuthId() ?? undefined;
        } else {
          context.user = await getOptionalAuth() ?? undefined;
          context.userId = context.user?.id;
        }
      }

      // Parse and validate body if schema provided
      let body: TBody = undefined as TBody;
      if (bodySchema) {
        const rawBody = await request.json().catch(() => ({}));
        body = bodySchema.parse(rawBody);
      }

      // Execute handler
      const result = await handler(request, context, body);

      // If handler returns NextResponse, use it directly
      if (result instanceof NextResponse) {
        return result;
      }

      // Otherwise wrap in JSON response
      return NextResponse.json(result);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

// ============================================================================
// Legacy Support (for gradual migration)
// ============================================================================

/**
 * @deprecated Use createRoute instead
 */
export function withErrorHandler<T>(handler: () => Promise<T>): Promise<NextResponse> {
  return handler()
    .then((result) => NextResponse.json(result))
    .catch((error) => errorResponse(error));
}
