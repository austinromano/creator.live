import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/friends - Get list of users the current user follows
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users that the current user follows
    const following = await prisma.follower.findMany({
      where: {
        followerId: currentUserId,
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            displayName: true,
            isVerified: true,
            lastSeenAt: true,
            streams: {
              where: {
                isLive: true,
              },
              select: {
                id: true,
                streamKey: true,
                title: true,
                viewerCount: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Consider user online if lastSeenAt is within the last 2 minutes
    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const now = Date.now();

    console.log('Found following records:', following.length);

    // Transform the data to a cleaner format
    const friends = following.map((f) => {
      const user = f.following;
      const liveStream = user.streams?.[0] || null;
      const isOnline = user.lastSeenAt
        ? (now - new Date(user.lastSeenAt).getTime()) < ONLINE_THRESHOLD_MS
        : false;

      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isOnline,
        isLive: !!liveStream,
        liveStream: liveStream
          ? {
              id: liveStream.id,
              roomName: `user-${user.id}`,
              title: liveStream.title,
              viewerCount: liveStream.viewerCount,
            }
          : null,
        followedAt: f.createdAt,
      };
    });

    // Sort: live users first, then online users, then by follow date
    friends.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime();
    });

    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
  }
}
