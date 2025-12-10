'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Settings, Users, Mic, MicOff, Video, VideoOff, PhoneOff, UserPlus, X, Search, Loader2, Trash2, LogOut, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  Track,
  LocalVideoTrack,
  LocalAudioTrack,
  VideoPresets,
  Participant,
  TrackPublication,
  RemoteTrackPublication,
} from 'livekit-client';

interface RoomMember {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isOnline: boolean;
  isHost: boolean;
  isMuted?: boolean;
  hasVideo?: boolean;
}

interface RoomData {
  id: string;
  name: string;
  icon: string | null;
  template: string | null;
  userId: string;
  isMember: boolean;
  allowMemberInvites: boolean;
  members: RoomMember[];
}

interface SearchUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface LiveKitParticipant {
  identity: string;
  oderId: string;
  participant: Participant;
  videoTrack?: Track;
  audioTrack?: Track;
  isMuted: boolean;
  hasVideo: boolean;
  isHost: boolean;
}

// Helper to extract user ID from LiveKit identity (format: "userId|displayName|avatar")
function getUserIdFromIdentity(identity: string): string {
  return identity.split('|')[0];
}

// Gradient backgrounds for participant cards
const CARD_GRADIENTS = [
  'from-gray-800 to-gray-900',              // Dark (for host with real video)
  'from-teal-400 to-green-300',             // Mint/teal
  'from-purple-400 to-purple-300',          // Purple
  'from-amber-200 to-orange-200',           // Cream/tan
  'from-pink-300 to-pink-200',              // Light pink
  'from-cyan-400 to-teal-300',              // Cyan
  'from-indigo-300 to-purple-200',          // Indigo light
];

function getGradientForUser(identity: string, index: number): string {
  if (index === 0) return CARD_GRADIENTS[0]; // First user gets dark background
  const gradientIndex = (identity.charCodeAt(0) + index) % (CARD_GRADIENTS.length - 1) + 1;
  return CARD_GRADIENTS[gradientIndex];
}

function ParticipantCard({
  participant,
  index,
  isLocal,
  displayInfo,
}: {
  participant: LiveKitParticipant;
  index: number;
  isLocal: boolean;
  displayInfo?: { displayName: string; avatar: string | null };
  isHost?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gradient = useMemo(() => getGradientForUser(participant.identity, index), [participant.identity, index]);

  // Parse identity to get display info
  const identityParts = participant.identity.split('|');
  const displayName = displayInfo?.displayName || identityParts[1] || participant.identity;
  const avatar = displayInfo?.avatar || (identityParts[2] !== 'null' ? identityParts[2] : null);

  // Attach video track to video element
  useEffect(() => {
    if (videoRef.current && participant.videoTrack) {
      participant.videoTrack.attach(videoRef.current);
      return () => {
        participant.videoTrack?.detach(videoRef.current!);
      };
    }
  }, [participant.videoTrack]);

  return (
    <div className={`relative aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-b ${gradient}`}>
      {/* Video/Avatar Display */}
      {participant.hasVideo && participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }}
        />
      ) : avatar ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <img
            src={avatar}
            alt={displayName}
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {displayName[0]?.toUpperCase() || '?'}
            </span>
          </div>
        </div>
      )}

      {/* Online Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-xs text-white font-medium">Online</span>
      </div>

      {/* Muted indicator */}
      {participant.isMuted && (
        <div className="absolute top-3 left-3 bg-red-500/80 rounded-full p-1.5">
          <MicOff className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-white font-bold text-lg drop-shadow-lg">
          {displayName}
        </h3>
        {participant.isHost && (
          <div className="inline-block bg-purple-500/80 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full mt-1">
            Host
          </div>
        )}
      </div>
    </div>
  );
}

// Invite Modal Component
function InviteModal({
  isOpen,
  onClose,
  roomId,
  roomName
}: {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.users || []);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const sendInvite = async (user: SearchUser) => {
    setSendingInvite(user.id);
    try {
      const response = await fetch('/api/rooms/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: user.id,
        }),
      });

      if (response.ok) {
        setInvitedUsers(prev => new Set([...prev, user.id]));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send invite');
      }
    } catch (error) {
      console.error('Invite error:', error);
      alert('Failed to send invite');
    } finally {
      setSendingInvite(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-[#1a1225] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Invite to {roomName}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#0f0a15] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto px-4 pb-4">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-[#252033] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        <span className="text-white font-medium">
                          {user.username[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-gray-400 text-sm">@{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendInvite(user)}
                    disabled={invitedUsers.has(user.id) || sendingInvite === user.id}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      invitedUsers.has(user.id)
                        ? 'bg-green-500/20 text-green-400 cursor-default'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {sendingInvite === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : invitedUsers.has(user.id) ? (
                      'Invited'
                    ) : (
                      'Invite'
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <p className="text-center text-gray-400 py-8">No users found</p>
          ) : (
            <p className="text-center text-gray-400 py-8">
              Search for users to invite
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Settings Modal Component (owner only)
function SettingsModal({
  isOpen,
  onClose,
  roomId,
  roomName,
  allowMemberInvites,
  onDeleteRoom,
  onToggleMemberInvites,
}: {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  allowMemberInvites: boolean;
  onDeleteRoom: () => void;
  onToggleMemberInvites: (value: boolean) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isTogglingInvites, setIsTogglingInvites] = useState(false);

  const handleDeleteRoom = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDeleteRoom();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete room');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete room');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleMemberInvites = async () => {
    setIsTogglingInvites(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowMemberInvites: !allowMemberInvites }),
      });

      if (response.ok) {
        onToggleMemberInvites(!allowMemberInvites);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update setting');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      alert('Failed to update setting');
    } finally {
      setIsTogglingInvites(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-[#1a1225] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Room Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!showConfirmDelete ? (
            <div className="space-y-4">
              <div className="p-3 bg-[#252033] rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Room Name</p>
                <p className="text-white font-medium">{roomName}</p>
              </div>

              {/* Allow Member Invites Toggle */}
              <div className="flex items-center justify-between p-3 bg-[#252033] rounded-lg">
                <div>
                  <p className="text-white font-medium">Allow Member Invites</p>
                  <p className="text-gray-400 text-sm">Members can invite others to join</p>
                </div>
                <button
                  onClick={handleToggleMemberInvites}
                  disabled={isTogglingInvites}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    allowMemberInvites ? 'bg-purple-600' : 'bg-gray-600'
                  } ${isTogglingInvites ? 'opacity-50' : ''}`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      allowMemberInvites ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="h-5 w-5" />
                Delete Room
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Delete &quot;{roomName}&quot;?</h3>
                <p className="text-gray-400 text-sm">
                  This action cannot be undone. All room data will be permanently deleted.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRoom}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Member Settings Modal (for non-owners - has Add/Leave options)
function MemberSettingsModal({
  isOpen,
  onClose,
  roomId,
  roomName,
  isMember,
  onAddRoom,
  onLeaveRoom,
}: {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  isMember: boolean;
  onAddRoom: () => void;
  onLeaveRoom: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  const handleAddRoom = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });

      if (response.ok) {
        onAddRoom();
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add room');
      }
    } catch (error) {
      console.error('Add room error:', error);
      alert('Failed to add room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/rooms/join?roomId=${roomId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onLeaveRoom();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to leave room');
      }
    } catch (error) {
      console.error('Leave error:', error);
      alert('Failed to leave room');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-[#1a1225] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Room Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!showConfirmLeave ? (
            <div className="space-y-4">
              <div className="p-3 bg-[#252033] rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Room Name</p>
                <p className="text-white font-medium">{roomName}</p>
              </div>

              {/* Add to My Rooms Button (if not a member) */}
              {!isMember && (
                <button
                  onClick={handleAddRoom}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Add to My Rooms
                    </>
                  )}
                </button>
              )}

              {/* Already Added indicator (if member) */}
              {isMember && (
                <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500/10 text-green-400 rounded-lg">
                  <Check className="h-5 w-5" />
                  Added to My Rooms
                </div>
              )}

              {/* Leave Button (only if member) */}
              {isMember && (
                <button
                  onClick={() => setShowConfirmLeave(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Leave Room
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
                  <LogOut className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Leave &quot;{roomName}&quot;?</h3>
                <p className="text-gray-400 text-sm">
                  You will be removed from this room. You can rejoin if invited again.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmLeave(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveRoom}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    'Leave'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrivateRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const roomId = params.id as string;

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<LiveKitParticipant[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [allowMemberInvites, setAllowMemberInvites] = useState(true);

  const livekitRoomRef = useRef<Room | null>(null);
  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);

  // Fetch room data
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        if (!response.ok) {
          throw new Error('Room not found');
        }
        const data = await response.json();
        setRoomData(data.room);
        setIsMember(data.room.isMember || false);
        setAllowMemberInvites(data.room.allowMemberInvites ?? true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load room');
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      fetchRoom();
    }
  }, [roomId]);

  // Update participant state helper
  const updateParticipantState = useCallback((room: Room) => {
    const allParticipants: LiveKitParticipant[] = [];
    const roomOwnerId = roomData?.userId;

    // Add local participant first
    const local = room.localParticipant;
    const localVideoPub = local.getTrackPublication(Track.Source.Camera);
    const localAudioPub = local.getTrackPublication(Track.Source.Microphone);
    const localUserId = getUserIdFromIdentity(local.identity);

    allParticipants.push({
      identity: local.identity,
      oderId: localUserId,
      participant: local,
      videoTrack: localVideoPub?.track || undefined,
      audioTrack: localAudioPub?.track || undefined,
      isMuted: !localAudioPub?.track || localAudioPub.isMuted,
      hasVideo: !!localVideoPub?.track && !localVideoPub.isMuted,
      isHost: localUserId === roomOwnerId,
    });

    // Add remote participants
    room.remoteParticipants.forEach((remote) => {
      const remoteVideoPub = remote.getTrackPublication(Track.Source.Camera);
      const remoteAudioPub = remote.getTrackPublication(Track.Source.Microphone);
      const remoteUserId = getUserIdFromIdentity(remote.identity);

      allParticipants.push({
        identity: remote.identity,
        oderId: remoteUserId,
        participant: remote,
        videoTrack: remoteVideoPub?.track || undefined,
        audioTrack: remoteAudioPub?.track || undefined,
        isMuted: !remoteAudioPub?.track || remoteAudioPub.isMuted,
        hasVideo: !!remoteVideoPub?.track && !remoteVideoPub.isMuted,
        isHost: remoteUserId === roomOwnerId,
      });
    });

    // Sort participants so host is always first
    allParticipants.sort((a, b) => {
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
      return 0;
    });

    setParticipants(allParticipants);
  }, [roomData?.userId]);

  // Connect to LiveKit room
  useEffect(() => {
    if (!roomData || !session?.user) return;

    const connectToLiveKit = async () => {
      setIsConnecting(true);

      try {
        const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
        if (!livekitUrl) {
          throw new Error('NEXT_PUBLIC_LIVEKIT_URL is not configured');
        }

        // Create identity with user info: id|displayName|avatar
        const identity = `${session.user.id}|${session.user.name || 'User'}|${session.user.image || 'null'}`;

        // Get LiveKit token with publisher permissions
        console.log('Fetching LiveKit token for room:', `room-${roomId}`);
        const tokenResponse = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: `room-${roomId}`,
            identity,
            isPublisher: true,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}));
          console.error('Token API error:', tokenResponse.status, errorData);
          throw new Error(errorData.error || `Failed to get LiveKit token: ${tokenResponse.status}`);
        }

        const { token } = await tokenResponse.json();
        console.log('Got LiveKit token, connecting to room...');

        // Create LiveKit room
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h720.resolution,
            facingMode: 'user',
          },
        });

        livekitRoomRef.current = room;

        // Setup event listeners
        room.on(RoomEvent.ParticipantConnected, (participant) => {
          console.log('Participant connected:', participant.identity);
          updateParticipantState(room);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          console.log('Participant disconnected:', participant.identity);
          updateParticipantState(room);
        });

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          console.log('Track subscribed:', track.kind, participant.identity);
          updateParticipantState(room);
        });

        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          console.log('Track unsubscribed:', track.kind, participant.identity);
          updateParticipantState(room);
        });

        room.on(RoomEvent.TrackMuted, (publication, participant) => {
          console.log('Track muted:', publication.kind, participant.identity);
          updateParticipantState(room);
        });

        room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
          console.log('Track unmuted:', publication.kind, participant.identity);
          updateParticipantState(room);
        });

        room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
          console.log('Local track published:', publication.kind);
          updateParticipantState(room);
        });

        room.on(RoomEvent.Disconnected, () => {
          console.log('Disconnected from LiveKit room');
        });

        // Connect to room
        console.log('Connecting to LiveKit URL:', livekitUrl);
        await room.connect(livekitUrl, token);
        console.log('Connected to LiveKit room:', `room-${roomId}`);

        // Enable camera and microphone
        try {
          await room.localParticipant.setCameraEnabled(true);
          await room.localParticipant.setMicrophoneEnabled(true);

          // Get references to local tracks
          const videoPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
          const audioPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);

          if (videoPub?.track) {
            localVideoTrackRef.current = videoPub.track as LocalVideoTrack;
          }
          if (audioPub?.track) {
            localAudioTrackRef.current = audioPub.track as LocalAudioTrack;
          }

          console.log('Camera and microphone enabled');
        } catch (mediaErr) {
          console.error('Failed to enable media:', mediaErr);
          setIsVideoOn(false);
        }

        // Initial participant state
        updateParticipantState(room);

      } catch (err) {
        console.error('Failed to connect to LiveKit:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to room');
      } finally {
        setIsConnecting(false);
      }
    };

    connectToLiveKit();

    return () => {
      // Cleanup on unmount
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        livekitRoomRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomData?.id, session?.user?.id, roomId]);

  // Toggle mute
  const toggleMute = async () => {
    if (!livekitRoomRef.current) return;

    try {
      await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    if (!livekitRoomRef.current) return;

    try {
      await livekitRoomRef.current.localParticipant.setCameraEnabled(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    } catch (err) {
      console.error('Failed to toggle video:', err);
    }
  };

  // Leave room
  const leaveRoom = () => {
    if (livekitRoomRef.current) {
      livekitRoomRef.current.disconnect();
      livekitRoomRef.current = null;
    }
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0a15] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-[#0f0a15] flex flex-col items-center justify-center p-4">
        <p className="text-red-400 mb-4">{error || 'Room not found'}</p>
        <Link href="/" className="text-purple-400 hover:underline">
          Go back home
        </Link>
      </div>
    );
  }

  // Check if current user is the room owner
  const isOwner = session?.user?.id === roomData.userId;

  // Get current user display info
  const currentUserDisplayInfo = session?.user ? {
    displayName: session.user.name || 'You',
    avatar: session.user.image || null,
  } : undefined;

  // Handle room deletion
  const handleDeleteRoom = () => {
    if (livekitRoomRef.current) {
      livekitRoomRef.current.disconnect();
      livekitRoomRef.current = null;
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0f0a15] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white font-semibold">{roomData.name}</h1>
            <p className="text-gray-400 text-sm flex items-center gap-1">
              <Users className="h-3 w-3" />
              {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Show invite button to owner OR to members if allowMemberInvites is true */}
          {(isOwner || (isMember && allowMemberInvites)) && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Invite user"
            >
              <UserPlus className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Room settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Participants Grid */}
      <div className="flex-1 p-3 overflow-y-auto">
        {isConnecting ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-4" />
            <p className="text-gray-400">Connecting to room...</p>
          </div>
        ) : participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-4" />
            <p className="text-gray-400">Setting up camera...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {participants.map((participant, index) => (
              <ParticipantCard
                key={participant.identity}
                participant={participant}
                index={index}
                isLocal={participant.participant === livekitRoomRef.current?.localParticipant}
                displayInfo={
                  participant.participant === livekitRoomRef.current?.localParticipant
                    ? currentUserDisplayInfo
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-4 p-4 pb-8 border-t border-gray-800 bg-[#0f0a15]">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-colors ${
            isMuted
              ? 'bg-red-500 text-white'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-colors ${
            !isVideoOn
              ? 'bg-red-500 text-white'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </button>

        <button
          onClick={leaveRoom}
          className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={roomId}
        roomName={roomData.name}
      />

      {/* Settings Modal (owner only) */}
      {isOwner && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          roomId={roomId}
          roomName={roomData.name}
          allowMemberInvites={allowMemberInvites}
          onDeleteRoom={handleDeleteRoom}
          onToggleMemberInvites={setAllowMemberInvites}
        />
      )}

      {/* Member Settings Modal (non-owners) */}
      {!isOwner && (
        <MemberSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          roomId={roomId}
          roomName={roomData.name}
          isMember={isMember}
          onAddRoom={() => setIsMember(true)}
          onLeaveRoom={handleDeleteRoom}
        />
      )}
    </div>
  );
}
