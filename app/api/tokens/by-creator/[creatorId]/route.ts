import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ creatorId: string }>;
}

// GET /api/tokens/by-creator/[creatorId] - Get tokens by creator address
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { creatorId } = await params;

    const token = await prisma.token.findFirst({
      where: { creatorAddress: creatorId },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'No token found for this creator' },
        { status: 404 }
      );
    }

    return NextResponse.json(token);
  } catch (error) {
    console.error('Error fetching token by creator:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token' },
      { status: 500 }
    );
  }
}
