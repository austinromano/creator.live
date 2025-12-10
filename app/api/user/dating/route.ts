import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/user/dating - Update dating profile
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      datingEnabled,
      lookingFor,
      relationshipStatus,
      interests,
      age,
      gender,
      location,
      datingBio,
    } = body;

    // Validate age if provided
    if (age !== null && age !== undefined) {
      if (age < 18 || age > 100) {
        return NextResponse.json({ error: 'Age must be between 18 and 100' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        datingEnabled: datingEnabled ?? false,
        lookingFor: lookingFor || null,
        relationshipStatus: relationshipStatus || null,
        interests: interests || [],
        age: age || null,
        gender: gender || null,
        location: location || null,
        datingBio: datingBio || null,
      },
      select: {
        id: true,
        datingEnabled: true,
        lookingFor: true,
        relationshipStatus: true,
        interests: true,
        age: true,
        gender: true,
        location: true,
        datingBio: true,
      },
    });

    return NextResponse.json({ success: true, profile: updatedUser });
  } catch (error) {
    console.error('Error updating dating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update dating profile' },
      { status: 500 }
    );
  }
}

// GET /api/user/dating - Get current user's dating profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        datingEnabled: true,
        lookingFor: true,
        relationshipStatus: true,
        interests: true,
        age: true,
        gender: true,
        location: true,
        datingBio: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error('Error fetching dating profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dating profile' },
      { status: 500 }
    );
  }
}
