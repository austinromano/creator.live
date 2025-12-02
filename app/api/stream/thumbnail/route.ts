import { NextRequest, NextResponse } from 'next/server';

// In-memory store for thumbnails (in production, use a database or blob storage)
const thumbnails: Map<string, string> = new Map();

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

    // Store the base64 thumbnail
    thumbnails.set(symbol.toUpperCase(), thumbnail);
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

    const thumbnail = thumbnails.get(symbol.toUpperCase());

    if (!thumbnail) {
      return NextResponse.json(
        { error: 'Thumbnail not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ thumbnail });
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

    thumbnails.delete(symbol.toUpperCase());
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
