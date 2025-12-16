'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface Friend {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

function InviteFriendsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get group data from URL params
  const groupName = searchParams.get('name') || '';
  const groupDescription = searchParams.get('description') || '';
  const groupVisibility = searchParams.get('visibility') || 'public';
  const groupImage = searchParams.get('image') || '';

  useEffect(() => {
    const fetchFriends = async () => {
      if (!session?.user) return;

      try {
        const response = await fetch('/api/user/friends');
        if (response.ok) {
          const data = await response.json();
          setFriends(data.friends || []);
        }
      } catch (error) {
        console.error('Failed to fetch friends:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, [session]);

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const unselectAll = () => {
    setSelectedFriends(new Set());
  };

  const handleCreateGroup = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          visibility: groupVisibility,
          icon: groupImage || null,
          invitedFriends: Array.from(selectedFriends),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/room/${data.room.id}`);
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/10 backdrop-blur-[4px] px-4 py-3">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1"
        >
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
      </div>

      <div className="px-4 pb-32">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-white">Select Friends</h1>
          <button
            onClick={unselectAll}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Unselect All
          </button>
        </div>

        {/* Friends List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-400 mb-2">No friends yet</p>
            <p className="text-gray-500 text-sm">Follow some people to add them to your group</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => toggleFriend(friend.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                  {friend.avatar ? (
                    <Image
                      src={friend.avatar}
                      alt={friend.username || ''}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                      {friend.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">
                    {friend.displayName || friend.username}
                  </p>
                  {friend.displayName && (
                    <p className="text-gray-400 text-sm">@{friend.username}</p>
                  )}
                </div>
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedFriends.has(friend.id)
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-gray-500'
                }`}>
                  {selectedFriends.has(friend.id) && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Button - Fixed at bottom */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-[#0f0a15] via-[#0f0a15] to-transparent pt-8">
        <button
          onClick={handleCreateGroup}
          disabled={isSubmitting}
          className="w-full py-4 bg-white text-black font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create group'}
        </button>
      </div>
    </div>
  );
}

export default function InviteFriendsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    }>
      <InviteFriendsContent />
    </Suspense>
  );
}
