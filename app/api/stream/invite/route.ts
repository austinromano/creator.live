import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// In-memory store for pending invites (in production, use Redis or database)
// Key: targetUsername, Value: invite data
const pendingInvites = new Map<string, {
  id: string;
  fromUsername: string;
  fromRoomName: string;
  fromAvatar?: string;
  toUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: number;
}>();

// Clean up old invites periodically (older than 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, invite] of pendingInvites.entries()) {
    if (now - invite.timestamp > 60000) {
      pendingInvites.delete(key);
    }
  }
}, 10000);

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

    const invite = {
      id: `invite-${Date.now()}`,
      fromUsername,
      fromRoomName,
      fromAvatar,
      toUsername,
      status: 'pending' as const,
      timestamp: Date.now(),
    };

    // Store invite keyed by target username
    pendingInvites.set(toUsername, invite);
    console.log('📨 Invite stored for:', toUsername, 'from:', fromUsername);

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

    console.log('📬 Invite check - username:', username, 'checkAcceptance:', checkAcceptance, 'pendingInvites size:', pendingInvites.size);

    if (checkAcceptance && fromUsername) {
      // Sender is checking if their invite was accepted
      const invite = pendingInvites.get(checkAcceptance);
      if (invite && invite.fromUsername === fromUsername) {
        if (invite.status === 'accepted') {
          // Clear the invite after sender sees acceptance
          pendingInvites.delete(checkAcceptance);
          return NextResponse.json({ accepted: true, invite });
        }
        return NextResponse.json({ accepted: false, status: invite.status });
      }
      return NextResponse.json({ accepted: false, status: 'not_found' });
    }

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    // Check for pending invite for this user
    const invite = pendingInvites.get(username);

    if (invite && invite.status === 'pending') {
      console.log('📨 Found pending invite for:', username);
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

    const invite = pendingInvites.get(username);

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (action === 'accept') {
      invite.status = 'accepted';
      // Store the accepter's room name so the inviter knows where to connect
      (invite as any).accepterRoomName = accepterRoomName;
      console.log('✅ Invite accepted by:', username);
    } else if (action === 'decline') {
      invite.status = 'declined';
      console.log('❌ Invite declined by:', username);
    }

    return NextResponse.json({ success: true, invite });
  } catch (error) {
    console.error('Error updating invite:', error);
    return NextResponse.json({ error: 'Failed to update invite' }, { status: 500 });
  }
}
