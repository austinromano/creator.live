'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Plus, Search, MessageCircle, Users } from 'lucide-react';

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
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');

  useEffect(() => {
    const fetchGroups = async () => {
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/rooms');
        if (response.ok) {
          const data = await response.json();
          setGroups(data.rooms || []);
        }
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [session]);

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
    { id: 'chats', label: 'Chats', icon: MessageCircle },
    { id: 'live', label: 'Live', icon: null },
    { id: 'discover', label: 'Discover', icon: null },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-32">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {session?.user?.image && (
              <div className="w-12 h-12 rounded-2xl overflow-hidden">
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            )}
            <h1 className="text-2xl font-semibold text-white">Community</h1>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700">
            <Users className="h-4 w-4 text-white" />
            <span className="text-white text-sm">Friends</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {tab.icon && <tab.icon className="h-4 w-4" />}
                {tab.label}
              </div>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-800/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-2">No groups yet</p>
            <p className="text-gray-500 text-sm">Create a group to start chatting</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredGroups.map((group) => (
              <Link
                key={group.id}
                href={`/room/${group.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                {/* Group Icon */}
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-700 flex-shrink-0">
                  {group.icon ? (
                    <Image
                      src={group.icon}
                      alt={group.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-600">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Group Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold truncate">{group.name}</h3>
                    {group.lastMessage?.time && (
                      <span className="text-gray-500 text-xs flex-shrink-0 ml-2">
                        {formatTime(group.lastMessage.time)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-gray-400 text-sm truncate">
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
                      <span className="ml-2 min-w-[24px] h-6 px-2 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-medium">
                          {group.unreadCount > 99 ? '99+' : group.unreadCount}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Floating Create Group Button */}
      <Link
        href="/creategroup"
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-5 py-3 bg-white text-black font-semibold rounded-full shadow-lg hover:bg-gray-100 transition-colors"
      >
        <Plus className="h-5 w-5" />
        <span>Create group</span>
      </Link>
    </div>
  );
}
