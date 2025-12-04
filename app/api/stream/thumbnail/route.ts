import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Upload thumbnail (base64 image data)
export async function POST(request: NextRequest) {
  try {
    const { symbol, thumbnail } = await request.json();

    if (!symbol || !thumbnail) {
      return NextResponse.json(
        { error: 'Missing symbol or thumbnail' },
        { status: 400 }
      );
    }

    // Find the stream by streamKey (roomName)
    const stream = await prisma.stream.findUnique({
      where: { streamKey: symbol }
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Update the thumbnail
    await prisma.stream.update({
      where: { streamKey: symbol },
      data: { thumbnail }
    });

    console.log(`Thumbnail updated for ${symbol}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving thumbnail:', error);
    return NextResponse.json(
      { error: 'Failed to save thumbnail' },
      { status: 500 }
    );
  }
}

// GET - Retrieve thumbnail
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing symbol' },
        { status: 400 }
      );
    }

    // Find the stream by streamKey
    const stream = await prisma.stream.findUnique({
      where: { streamKey: symbol },
      select: { thumbnail: true }
    });

    if (!stream || !stream.thumbnail) {
      return NextResponse.json(
        { error: 'Thumbnail not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ thumbnail: stream.thumbnail });
  } catch (error) {
    console.error('Error retrieving thumbnail:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve thumbnail' },
      { status: 500 }
    );
  }
}

// DELETE - Remove thumbnail when stream ends
export async function DELETE(request: NextRequest) {
  try {
    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing symbol' },
        { status: 400 }
      );
    }

    // Clear the thumbnail
    await prisma.stream.update({
      where: { streamKey: symbol },
      data: { thumbnail: null }
    });

    console.log(`Thumbnail deleted for ${symbol}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    return NextResponse.json(
      { error: 'Failed to delete thumbnail' },
      { status: 500 }
    );
  }
}
