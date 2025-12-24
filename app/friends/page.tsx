'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Plus, Search, MessageCircle, Users, Bell, Home } from 'lucide-react';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { StoriesRow, type UserRoom } from '@/components/feed/StoriesRow';
import { useRouter } from 'next/navigation';

interface Group {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  memberCount: number;
  lastMessage?: {
    user: string;
    text: string;
    time: string;
  };
  unreadCount?: number;
}

interface FriendData {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isLive: boolean;
  isOnline: boolean;
}

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [rooms, setRooms] = useState<UserRoom[]>([]);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('notifications');

  useEffect(() => {
    const fetchData = async () => {
      // Wait for session to be determined
      if (status === 'loading') {
        return;
      }

      // No session - stop loading
      if (status === 'unauthenticated' || !session?.user) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch all data in parallel
        const [groupsRes, friendsRes, userRes, roomsRes] = await Promise.all([
          fetch('/api/rooms', { credentials: 'include' }),
          fetch('/api/user/friends', { credentials: 'include' }),
          fetch('/api/user/me', { credentials: 'include' }),
          fetch('/api/rooms', { credentials: 'include' }),
        ]);

        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setGroups(groupsData.rooms || []);
        }

        if (friendsRes.ok) {
          const friendsData = await friendsRes.json();
          const storyUsers = (friendsData.friends || []).map((f: FriendData) => ({
            id: f.id,
            username: f.username,
            displayName: f.displayName,
            avatar: f.avatar,
            isLive: f.isLive,
            isOnline: f.isOnline,
            hasStory: false,
          }));
          setFriends(storyUsers);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.user) {
            setCurrentUserAvatar(userData.user.avatar);
          }
        }

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          const userRooms = (roomsData.rooms || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            icon: r.icon,
            template: r.template,
          }));
          setRooms(userRooms);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, status]);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const tabs = [
    { id: 'notifications', label: 'All', icon: Bell },
    { id: 'chats', label: 'Chats', icon: MessageCircle },
    { id: 'rooms', label: 'Rooms', icon: Home },
    { id: 'community', label: 'Communities', icon: Users },
    { id: 'groups', label: 'Groups', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="pt-4 pb-2 px-4">
          {/* Stories/Online Friends Section */}
          <div className="-mx-4">
            <StoriesRow
              users={friends}
              rooms={rooms}
              currentUserAvatar={currentUserAvatar}
              onAddStoryClick={() => window.location.href = '/createroom'}
            />
          </div>

          {/* Tabs */}
          <div className="flex justify-between border-b border-white/10 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 text-xs font-semibold transition-all relative ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  {tab.icon && <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />}
                  <span className="text-[10px]">{tab.label}</span>
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content - Notifications, Chats, or Groups */}
      <div className="px-4 pt-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : activeTab === 'notifications' ? (
          // Notifications List
          <NotificationsList />
        ) : activeTab === 'chats' ? (
          // Direct Messages (Coming Soon)
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-800/40 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 border border-white/5">
              <MessageCircle className="h-9 w-9 text-gray-400" />
            </div>
            <p className="text-white font-medium mb-2">No direct messages yet</p>
            <p className="text-gray-500 text-sm">Start a conversation with someone</p>
          </div>
        ) : activeTab === 'community' ? (
          // Community
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-800/40 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 border border-white/5">
              <Users className="h-9 w-9 text-gray-400" />
            </div>
            <p className="text-white font-medium mb-2">No communities yet</p>
            <p className="text-gray-500 text-sm">Create a community to get started</p>
          </div>
        ) : activeTab === 'groups' ? (
          // Groups
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-800/40 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 border border-white/5">
              <Users className="h-9 w-9 text-gray-400" />
            </div>
            <p className="text-white font-medium mb-2">No groups yet</p>
            <p className="text-gray-500 text-sm">Create a group to get started</p>
          </div>
        ) : (
          // Rooms List
          filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-gray-800/40 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 border border-white/5">
                <Users className="h-9 w-9 text-gray-400" />
              </div>
              <p className="text-white font-medium mb-2">No groups yet</p>
              <p className="text-gray-500 text-sm">Create a group to start chatting</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/room/${group.id}`}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-800/30 backdrop-blur-sm border border-white/5 hover:bg-gray-800/50 transition-colors"
                >
                  {/* Group Icon */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-700 flex-shrink-0">
                    {group.icon ? (
                      <Image
                        src={group.icon}
                        alt={group.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-700">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Group Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold text-sm truncate">{group.name}</h3>
                      {group.lastMessage?.time && (
                        <span className="text-gray-500 text-xs flex-shrink-0 ml-2">
                          {formatTime(group.lastMessage.time)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-gray-400 text-xs truncate">
                        {group.lastMessage ? (
                          <>
                            <span className="text-gray-500">{group.lastMessage.user}: </span>
                            {group.lastMessage.text}
                          </>
                        ) : (
                          group.description || 'No messages yet'
                        )}
                      </p>
                      {group.unreadCount && group.unreadCount > 0 && (
                        <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">
                            {group.unreadCount > 99 ? '99+' : group.unreadCount}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>

      {/* Floating Add Friend Button - Only show on Notifications tab */}
      {activeTab === 'notifications' && (
        <Link
          href="/addfriend"
          className="fixed bottom-28 right-4 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full shadow-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          <span>Add Friend</span>
        </Link>
      )}

      {/* Floating Create Room Button - Only show on Rooms tab */}
      {activeTab === 'rooms' && (
        <Link
          href="/creategroup"
          className="fixed bottom-28 right-4 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full shadow-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          <span>Create room</span>
        </Link>
      )}

      {/* Floating Create Community Button - Only show on Community tab */}
      {activeTab === 'community' && (
        <Link
          href="/createcommunity"
          className="fixed bottom-28 right-4 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full shadow-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          <span>Create community</span>
        </Link>
      )}

      {/* Floating Create Group Button - Only show on Groups tab */}
      {activeTab === 'groups' && (
        <Link
          href="/creategroup"
          className="fixed bottom-28 right-4 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full shadow-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          <span>Create group</span>
        </Link>
      )}
    </div>
  );
}
