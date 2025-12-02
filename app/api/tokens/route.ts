import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/tokens - Get all tokens
export async function GET() {
  try {
    const tokens = await prisma.token.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tokens);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

// POST /api/tokens - Create a new token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, symbol, description, avatar, creatorAddress, twitter, website, telegram } = body;

    if (!name || !symbol || !creatorAddress) {
      return NextResponse.json(
        { error: 'Name, symbol, and creatorAddress are required' },
        { status: 400 }
      );
    }

    // Check if symbol already exists
    const existing = await prisma.token.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Token symbol already exists' },
        { status: 409 }
      );
    }

    const initialPrice = 0.00001;
    const token = await prisma.token.create({
      data: {
        name,
        symbol: symbol.toUpperCase(),
        description: description || '',
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${symbol}`,
        creatorAddress,
        price: initialPrice,
        marketCap: initialPrice * 1000000,
        twitter,
        website,
        telegram,
      },
    });

    return NextResponse.json(token, { status: 201 });
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json(
      { error: 'Failed to create token' },
      { status: 500 }
    );
  }
}
