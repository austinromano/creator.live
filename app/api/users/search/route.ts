import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthId, errorResponse, BadRequestError } from '@/lib/api/middleware';

// GET /api/users/search - Search for users by username
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await requireAuthId();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 1) {
      throw new BadRequestError('Search query is required');
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
          { id: { not: currentUserId } }, // Exclude current user
          { username: { not: null } }, // Only users with usernames
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
      },
      take: 10,
      orderBy: {
        username: 'asc',
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return errorResponse(error);
  }
}
