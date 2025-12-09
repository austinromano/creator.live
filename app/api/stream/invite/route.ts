import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Send an invite
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toUsername, fromUsername, fromRoomName, fromAvatar } = await request.json();

    if (!toUsername || !fromUsername || !fromRoomName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Delete any existing pending invites from this user to the same target
    await prisma.streamInvite.deleteMany({
      where: {
        fromUsername,
        toUsername,
        status: 'pending',
      },
    });

    // Create new invite with 60 second expiration
    const invite = await prisma.streamInvite.create({
      data: {
        fromUsername,
        fromRoomName,
        fromAvatar,
        toUsername,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60000), // 60 seconds
      },
    });

    console.log('Invite stored for:', toUsername, 'from:', fromUsername);

    return NextResponse.json({ success: true, invite });
  } catch (error) {
    console.error('Error sending invite:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}

// GET - Check for pending invites (called by the target user)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const checkAcceptance = searchParams.get('checkAcceptance');
    const fromUsername = searchParams.get('fromUsername');

    // Clean up expired invites
    await prisma.streamInvite.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (checkAcceptance && fromUsername) {
      // Sender is checking if their invite was accepted
      const invite = await prisma.streamInvite.findFirst({
        where: {
          fromUsername,
          toUsername: checkAcceptance,
          status: 'accepted',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (invite) {
        // Delete the invite after sender sees acceptance
        await prisma.streamInvite.delete({ where: { id: invite.id } });
        return NextResponse.json({ accepted: true, invite });
      }

      return NextResponse.json({ accepted: false, status: 'not_found' });
    }

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    // Check for pending invite for this user
    const invite = await prisma.streamInvite.findFirst({
      where: {
        toUsername: username,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (invite) {
      console.log('Found pending invite for:', username, 'from:', invite.fromUsername);
      return NextResponse.json({ hasInvite: true, invite });
    }

    return NextResponse.json({ hasInvite: false });
  } catch (error) {
    console.error('Error checking invites:', error);
    return NextResponse.json({ error: 'Failed to check invites' }, { status: 500 });
  }
}

// PUT - Accept or decline an invite
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, action, accepterRoomName } = await request.json();

    if (!username || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the pending invite for this user
    const invite = await prisma.streamInvite.findFirst({
      where: {
        toUsername: username,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (action === 'accept') {
      await prisma.streamInvite.update({
        where: { id: invite.id },
        data: {
          status: 'accepted',
          accepterRoomName,
        },
      });
      console.log('Invite accepted by:', username);
    } else if (action === 'decline') {
      await prisma.streamInvite.update({
        where: { id: invite.id },
        data: { status: 'declined' },
      });
      console.log('Invite declined by:', username);
    }

    return NextResponse.json({ success: true, invite });
  } catch (error) {
    console.error('Error updating invite:', error);
    return NextResponse.json({ error: 'Failed to update invite' }, { status: 500 });
  }
}
