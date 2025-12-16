'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Pencil, Check } from 'lucide-react';
import Image from 'next/image';

type GroupVisibility = 'public' | 'private' | 'approval';

export default function CreateGroupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<GroupVisibility>('public');
  const [groupImage, setGroupImage] = useState<string | null>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!groupName.trim()) return;

    // Navigate to invite friends page with group data
    const params = new URLSearchParams({
      name: groupName,
      description,
      visibility,
      ...(groupImage && { image: groupImage }),
    });

    router.push(`/creategroup/invite?${params.toString()}`);
  };

  const visibilityOptions = [
    {
      id: 'public' as GroupVisibility,
      title: 'Public Group',
      description: 'This will make your group visible to everyone and allow anyone to join without approval.',
    },
    {
      id: 'private' as GroupVisibility,
      title: 'Private Group',
      description: 'This will make your group invisible to everyone and enable joining only via invite link.',
    },
    {
      id: 'approval' as GroupVisibility,
      title: 'Public Group with Admin Approval',
      description: 'This will make your group visible to everyone but joining will require admin approval.',
    },
  ];

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
        {/* Group Image Upload */}
        <div className="flex justify-center mt-4 mb-8">
          <div className="relative">
            <button
              onClick={handleImageClick}
              className="w-28 h-28 rounded-full bg-white flex items-center justify-center overflow-hidden"
            >
              {groupImage ? (
                <Image
                  src={groupImage}
                  alt="Group"
                  fill
                  className="object-cover"
                />
              ) : (
                <ImageIcon className="h-12 w-12 text-gray-400" />
              )}
            </button>
            <button
              onClick={handleImageClick}
              className="absolute bottom-0 right-0 w-9 h-9 bg-black rounded-full flex items-center justify-center border-2 border-black"
            >
              <Pencil className="h-4 w-4 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Group Name */}
        <div className="mb-6">
          <label className="block text-white text-sm mb-2">Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter a name for your group"
            className="w-full px-4 py-4 bg-transparent border border-gray-600 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Group Description */}
        <div className="mb-8">
          <label className="block text-white text-sm mb-2">Group Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe here..."
            rows={5}
            className="w-full px-4 py-4 bg-transparent border border-gray-600 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        {/* Visibility Options */}
        <div className="space-y-4">
          {visibilityOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setVisibility(option.id)}
              className="w-full flex items-start justify-between text-left"
            >
              <div className="flex-1 pr-4">
                <h3 className="text-white font-semibold">{option.title}</h3>
                <p className="text-gray-400 text-sm mt-1">{option.description}</p>
              </div>
              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                visibility === option.id
                  ? 'bg-purple-500 border-purple-500'
                  : 'border-gray-500'
              }`}>
                {visibility === option.id && (
                  <Check className="h-4 w-4 text-white" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Next Button - Fixed at bottom */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-[#0f0a15] via-[#0f0a15] to-transparent pt-8">
        <button
          onClick={handleSubmit}
          disabled={!groupName.trim()}
          className="w-full py-4 bg-white text-black font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
