'use client';

import { useState } from 'react';
import { X, Loader2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditDatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    datingEnabled: boolean;
    lookingFor: string | null;
    relationshipStatus: string | null;
    interests: string[];
    age: number | null;
    gender: string | null;
    location: string | null;
    datingBio: string | null;
  };
  onSave: () => void;
}

const LOOKING_FOR_OPTIONS = [
  { id: 'friendship', label: 'Friendship' },
  { id: 'dating', label: 'Dating' },
  { id: 'networking', label: 'Networking' },
  { id: 'collaboration', label: 'Collaboration' },
  { id: 'open', label: 'Open to anything' },
];

const RELATIONSHIP_STATUS_OPTIONS = [
  { id: 'single', label: 'Single' },
  { id: 'taken', label: 'In a relationship' },
  { id: 'complicated', label: "It's complicated" },
  { id: 'open', label: 'Open relationship' },
];

const GENDER_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'non-binary', label: 'Non-binary' },
  { id: 'other', label: 'Other' },
  { id: 'prefer-not', label: 'Prefer not to say' },
];

const SUGGESTED_INTERESTS = [
  'Gaming', 'Music', 'Art', 'Photography', 'Travel', 'Fitness',
  'Cooking', 'Movies', 'Reading', 'Tech', 'Fashion', 'Sports',
  'Nature', 'Anime', 'Dancing', 'Streaming', 'Comedy', 'Podcasts',
];

export function EditDatingModal({
  isOpen,
  onClose,
  profile,
  onSave,
}: EditDatingModalProps) {
  const [datingEnabled, setDatingEnabled] = useState(profile.datingEnabled);
  const [lookingFor, setLookingFor] = useState<string[]>(
    profile.lookingFor?.split(',').map(s => s.trim()).filter(Boolean) || []
  );
  const [relationshipStatus, setRelationshipStatus] = useState(profile.relationshipStatus || '');
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [age, setAge] = useState(profile.age?.toString() || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [location, setLocation] = useState(profile.location || '');
  const [datingBio, setDatingBio] = useState(profile.datingBio || '');
  const [customInterest, setCustomInterest] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const toggleLookingFor = (id: string) => {
    setLookingFor(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      setInterests([...interests, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/dating', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datingEnabled,
          lookingFor: lookingFor.join(','),
          relationshipStatus: relationshipStatus || null,
          interests,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          location: location || null,
          datingBio: datingBio || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update dating profile');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving dating profile:', error);
      alert('Failed to save dating profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1525] rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden border border-pink-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            <h2 className="text-lg font-semibold text-white">Connect Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Enable Dating Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-white">Enable Connect</p>
              <p className="text-xs text-gray-400">Show your dating profile on your page</p>
            </div>
            <button
              onClick={() => setDatingEnabled(!datingEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                datingEnabled ? 'bg-pink-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  datingEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {datingEnabled && (
            <>
              {/* Dating Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Connect Bio
                </label>
                <textarea
                  value={datingBio}
                  onChange={(e) => setDatingBio(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full px-3 py-2 bg-[#0f0a15] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                  placeholder="Tell others what you're looking for..."
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{datingBio.length}/300</p>
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min="18"
                    max="100"
                    className="w-full px-3 py-2 bg-[#0f0a15] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                    placeholder="Your age"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f0a15] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500 transition-colors"
                  >
                    <option value="">Select...</option>
                    {GENDER_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0a15] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                  placeholder="City, Country"
                />
              </div>

              {/* Relationship Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Relationship Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {RELATIONSHIP_STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setRelationshipStatus(relationshipStatus === opt.id ? '' : opt.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        relationshipStatus === opt.id
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Looking For */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Looking For
                </label>
                <div className="flex flex-wrap gap-2">
                  {LOOKING_FOR_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => toggleLookingFor(opt.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        lookingFor.includes(opt.id)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Interests
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {SUGGESTED_INTERESTS.map(interest => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        interests.includes(interest)
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
                    className="flex-1 px-3 py-2 bg-[#0f0a15] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors text-sm"
                    placeholder="Add custom interest..."
                  />
                  <Button
                    onClick={addCustomInterest}
                    size="sm"
                    className="bg-gray-800 hover:bg-gray-700"
                  >
                    Add
                  </Button>
                </div>
                {interests.filter(i => !SUGGESTED_INTERESTS.includes(i)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {interests.filter(i => !SUGGESTED_INTERESTS.includes(i)).map(interest => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className="px-3 py-1.5 rounded-full text-sm bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                      >
                        {interest} &times;
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
