'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Plus, MessageCircle, Users, Bell, Home } from 'lucide-react';
import { NotificationsList } from '@/components/notifications/NotificationsList';

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

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        // Fetch rooms data
        const groupsRes = await fetch('/api/rooms', { credentials: 'include' });

        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setGroups(groupsData.rooms || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, status]);

  const filteredGroups = groups;

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
      {/* Content - Notifications, Chats, or Groups */}
      <div className="px-4 pt-3 pb-28">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : activeTab === 'notifications' ? (
          // Notifications List
          <NotificationsList />
        ) : activeTab === 'chats' ? (
          // Direct Messages (Coming Soon)
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 shadow-lg shadow-purple-500/10">
              <MessageCircle className="h-10 w-10 text-purple-400" />
            </div>
            <p className="text-white font-semibold mb-2 text-lg">No direct messages yet</p>
            <p className="text-gray-400 text-sm max-w-xs">Start a conversation with someone from your network</p>
          </div>
        ) : activeTab === 'community' ? (
          // Community
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 shadow-lg shadow-purple-500/10">
              <Users className="h-10 w-10 text-purple-400" />
            </div>
            <p className="text-white font-semibold mb-2 text-lg">No communities yet</p>
            <p className="text-gray-400 text-sm max-w-xs">Create a community to connect with others</p>
          </div>
        ) : activeTab === 'groups' ? (
          // Groups
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 shadow-lg shadow-purple-500/10">
              <Users className="h-10 w-10 text-purple-400" />
            </div>
            <p className="text-white font-semibold mb-2 text-lg">No groups yet</p>
            <p className="text-gray-400 text-sm max-w-xs">Create a group to start chatting with friends</p>
          </div>
        ) : (
          // Rooms List
          filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 shadow-lg shadow-purple-500/10">
                <Users className="h-10 w-10 text-purple-400" />
              </div>
              <p className="text-white font-semibold mb-2 text-lg">No rooms yet</p>
              <p className="text-gray-400 text-sm max-w-xs">Create a room to start chatting with friends</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/room/${group.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border border-white/5 hover:border-purple-500/30 hover:bg-gray-800/60 transition-all duration-200 group"
                >
                  {/* Group Icon */}
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-700 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                    {group.icon ? (
                      <Image
                        src={group.icon}
                        alt={group.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600">
                        <Users className="h-6 w-6 text-white" />
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

      {/* Bottom Tabs Navigation */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-transparent border-t border-white/10">
        <div className="grid grid-cols-5 h-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-start pt-1 relative group"
            >
              {tab.icon && <tab.icon className={`h-6 w-6 transition-all ${activeTab === tab.id ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-white/80'}`} />}
              <span className={`text-[10px] mt-1 ${activeTab === tab.id ? 'text-purple-400' : 'text-white/60'}`}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
