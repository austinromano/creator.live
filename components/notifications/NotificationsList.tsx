'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Bell, Users, UserPlus, Star } from 'lucide-react';

interface NotificationData {
  id: string;
  type: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  fromUser: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatar: string | null;
  };
  post?: {
    id: string;
    title: string | null;
    thumbnailUrl: string | null;
  } | null;
  room?: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

function getNotificationText(notification: NotificationData): string {
  switch (notification.type) {
    case 'spark':
      return 'gave you a star';
    case 'follow':
      return 'started following you';
    case 'comment':
      return 'commented on your post';
    case 'tip':
      return 'sent you a tip';
    case 'live':
      return 'went live';
    case 'room_invite':
      return notification.room
        ? `invited you to join "${notification.room.name}"`
        : 'invited you to join a room';
    default:
      return notification.message || 'interacted with you';
  }
}

function getNotificationIcon(type: string): React.ReactNode {
  switch (type) {
    case 'spark':
      return <Star className="h-4 w-4 text-purple-400 fill-purple-400" />;
    case 'follow':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-400" fill="currentColor">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="11" x2="22" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'tip':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'live':
      return (
        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      );
    case 'room_invite':
      return <Users className="h-4 w-4 text-purple-400" />;
    default:
      return <Bell className="h-4 w-4 text-gray-400" />;
  }
}

export function NotificationsList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.status === 401) {
        // Not authenticated, just show empty state
        setNotifications([]);
        setLoading(false);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  }, []);

  const joinRoom = useCallback(async (roomId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Just navigate to the room - don't auto-add to navbar
    // User can add to their rooms from within the room
    router.push(`/room/${roomId}`);
  }, [router]);

  useEffect(() => {
    // Only fetch when session is ready and authenticated
    if (status === 'authenticated') {
      fetchNotifications();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, fetchNotifications]);

  // Mark all as read when notifications are loaded
  useEffect(() => {
    if (notifications.length > 0 && notifications.some((n) => !n.isRead)) {
      markAllAsRead();
    }
  }, [notifications.length > 0, markAllAsRead]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 animate-in fade-in duration-300">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 shadow-lg shadow-purple-500/10">
          <Bell className="h-12 w-12 text-purple-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">No Notifications Yet</h2>
        <p className="text-gray-400 text-center max-w-xs text-sm">
          When someone interacts with your content, you&apos;ll see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {notifications.map((notification) => (
        <Link
          key={notification.id}
          href={
            notification.type === 'room_invite' && notification.room
              ? `/room/${notification.room.id}`
              : notification.type === 'follow'
              ? `/profile/${notification.fromUser.username}`
              : notification.post
              ? `/post/${notification.post.id}`
              : `/profile/${notification.fromUser.username}`
          }
          className={`flex items-start gap-2 px-2 py-2 rounded-2xl border transition-all duration-200 group ${
            !notification.isRead
              ? 'bg-gradient-to-br from-purple-900/25 via-purple-800/15 to-pink-900/20 border-purple-500/25 hover:border-purple-400/35 hover:bg-purple-900/35'
              : 'bg-gradient-to-br from-gray-800/30 via-gray-900/25 to-purple-900/10 border-white/5 hover:border-purple-500/15 hover:bg-gray-800/40'
          }`}
        >
          {/* Avatar with notification type icon */}
          <div className="relative flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
            <Avatar className="h-13 w-13 border-2 border-white/10">
              <AvatarImage src={notification.fromUser.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-purple-700 text-white font-semibold">
                {notification.fromUser.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {/* Notification type badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-gradient-to-br from-gray-900 to-black rounded-full flex items-center justify-center ring-2 ring-[#0f0a15] shadow-lg">
              {getNotificationIcon(notification.type)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white">
              <span className="font-semibold">
                {notification.fromUser.displayName || notification.fromUser.username}
              </span>{' '}
              <span className="text-gray-400">
                {getNotificationText(notification)}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatTimeAgo(notification.createdAt)}
            </p>
          </div>

          {/* Join button for room invites */}
          {notification.type === 'room_invite' && notification.room && (
            <button
              onClick={(e) => joinRoom(notification.room!.id, e)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors bg-purple-600 hover:bg-purple-700 text-white"
            >
              <UserPlus className="h-4 w-4" />
              Join
            </button>
          )}

          {/* Post thumbnail if applicable */}
          {notification.post?.thumbnailUrl && (
            <div className="flex-shrink-0">
              <img
                src={notification.post.thumbnailUrl}
                alt=""
                className="w-12 h-12 object-cover rounded"
              />
            </div>
          )}

          {/* Unread indicator */}
          {!notification.isRead && !notification.room && (
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
