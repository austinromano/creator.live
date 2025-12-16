'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { X, ChevronRight, ChevronLeft, Gamepad2, Users, BookOpen, GraduationCap, Sparkles, Camera, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface RoomTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const templates: RoomTemplate[] = [
  {
    id: 'gaming',
    name: 'Gaming',
    icon: <Gamepad2 className="h-5 w-5 text-purple-400" />,
    description: 'Stream your gameplay',
  },
  {
    id: 'friends',
    name: 'Friends',
    icon: <Users className="h-5 w-5 text-pink-400" />,
    description: 'Hang out with friends',
  },
  {
    id: 'study',
    name: 'Study Group',
    icon: <BookOpen className="h-5 w-5 text-yellow-400" />,
    description: 'Study together',
  },
  {
    id: 'creative',
    name: 'Creative',
    icon: <GraduationCap className="h-5 w-5 text-blue-400" />,
    description: 'Share your creativity',
  },
];

type Step = 'select' | 'customize';

export default function CreateRoomPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomIcon, setRoomIcon] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default room name based on username
  useEffect(() => {
    if (session?.user?.name) {
      setRoomName(`${session.user.name}'s room`);
    }
  }, [session]);

  const handleSelectTemplate = (templateId: string | null) => {
    setSelectedTemplate(templateId);
    setStep('customize');
  };

  const handleBack = () => {
    if (step === 'customize') {
      setStep('select');
      setSelectedTemplate(null);
    } else {
      router.back();
    }
  };

  const handleCreate = async () => {
    if (!roomName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roomName.trim(),
          template: selectedTemplate,
          icon: roomIcon,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create room');
      }

      const data = await response.json();
      const room = data.room;

      // Navigate to the private room
      router.push(`/room/${room.id}`);
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setIsCreating(false);
    }
  };

  const handleIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/rooms/icon', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const data = await response.json();
      setRoomIcon(data.url);
    } catch (err) {
      console.error('Error uploading icon:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Selection Step
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-[#0f0a15] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#1a1225] rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative p-6 pb-4 text-center">
            <button
              onClick={() => router.back()}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h1 className="text-2xl font-bold text-white mb-2">
              Create Your Room
            </h1>
            <p className="text-gray-400 text-sm">
              Your room is where you and your friends hang out. Make yours and start talking.
            </p>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            {/* Create My Own */}
            <button
              onClick={() => handleSelectTemplate(null)}
              className="w-full flex items-center gap-4 p-4 bg-[#252033] hover:bg-[#2d2640] rounded-lg mb-4 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="flex-1 text-left text-white font-medium">
                Create My Own
              </span>
              <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white transition-colors" />
            </button>

            {/* Templates Section */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
                Start from a template
              </h3>

              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className="w-full flex items-center gap-4 p-4 bg-[#252033] hover:bg-[#2d2640] rounded-lg transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#1a1225] flex items-center justify-center">
                      {template.icon}
                    </div>
                    <span className="flex-1 text-left text-white font-medium">
                      {template.name}
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Join Section */}
          <div className="bg-[#13101a] p-4 text-center">
            <p className="text-gray-400 text-sm mb-3">
              Have an invite already?
            </p>
            <Link
              href="/community"
              className="block w-full py-3 bg-[#252033] hover:bg-[#2d2640] text-white font-medium rounded-lg transition-colors"
            >
              Join a Room
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Customize Step
  return (
    <div className="min-h-screen bg-[#0f0a15] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1a1225] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative p-6 pb-4 text-center">
          <button
            onClick={() => router.back()}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <h1 className="text-2xl font-bold text-white mb-2">
            Customize Your Room
          </h1>
          <p className="text-gray-400 text-sm">
            Give your new room a personality with a name and an icon. You can always change it later.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Icon Upload */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handleIconClick}
              disabled={isUploading}
              className="relative w-20 h-20 rounded-full border-2 border-dashed border-gray-600 hover:border-gray-500 flex flex-col items-center justify-center text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50 overflow-hidden"
            >
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : roomIcon ? (
                <img src={roomIcon} alt="Room icon" className="w-full h-full rounded-full object-cover" />
              ) : (
                <>
                  <Camera className="h-6 w-6 mb-1" />
                  <span className="text-[10px] uppercase font-semibold">Upload</span>
                </>
              )}
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
            </button>
          </div>

          {/* Room Name Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Room Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              disabled={isCreating}
              className="w-full px-4 py-3 bg-[#0f0a15] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-400 mb-4">{error}</p>
          )}

          {/* Terms */}
          <p className="text-xs text-gray-500 mb-6">
            By creating a room, you agree to our{' '}
            <Link href="/terms" className="text-purple-400 hover:underline">
              Community Guidelines
            </Link>
            .
          </p>
        </div>

        {/* Footer */}
        <div className="bg-[#13101a] p-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={isCreating || isUploading}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={handleCreate}
            disabled={!roomName.trim() || isCreating || isUploading}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
