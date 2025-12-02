import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ symbol: string }>;
}

// GET /api/tokens/[symbol] - Get a single token by symbol
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { symbol } = await params;

    const token = await prisma.token.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(token);
  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token' },
      { status: 500 }
    );
  }
}

// PATCH /api/tokens/[symbol] - Update a token
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { symbol } = await params;
    const body = await request.json();

    const token = await prisma.token.update({
      where: { symbol: symbol.toUpperCase() },
      data: body,
    });

    return NextResponse.json(token);
  } catch (error) {
    console.error('Error updating token:', error);
    return NextResponse.json(
      { error: 'Failed to update token' },
      { status: 500 }
    );
  }
}

// DELETE /api/tokens/[symbol] - Delete a token
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { symbol } = await params;

    await prisma.token.delete({
      where: { symbol: symbol.toUpperCase() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting token:', error);
    return NextResponse.json(
      { error: 'Failed to delete token' },
      { status: 500 }
    );
  }
}
