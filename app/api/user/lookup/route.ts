import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Look up user by username to get their avatar
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive', // Case-insensitive search
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error looking up user:', error);
    return NextResponse.json(
      { error: 'Failed to look up user' },
      { status: 500 }
    );
  }
}
