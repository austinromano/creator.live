'use client';

import { Heart, MapPin, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DatingProfileProps {
  datingEnabled: boolean;
  lookingFor?: string | null;
  relationshipStatus?: string | null;
  interests?: string[];
  age?: number | null;
  gender?: string | null;
  location?: string | null;
  datingBio?: string | null;
  isOwnProfile: boolean;
  onEditClick?: () => void;
}

export function DatingProfile({
  datingEnabled,
  lookingFor,
  relationshipStatus,
  interests = [],
  age,
  gender,
  location,
  datingBio,
  isOwnProfile,
  onEditClick,
}: DatingProfileProps) {
  if (!datingEnabled) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
          <Heart className="h-10 w-10 text-pink-500/50" />
        </div>
        {isOwnProfile ? (
          <>
            <h3 className="text-lg font-semibold text-white mb-2">Enable Connect</h3>
            <p className="text-gray-400 text-sm mb-4">
              Share your interests and connect with others
            </p>
            <Button
              onClick={onEditClick}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
            >
              Set Up Connect Profile
            </Button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-white mb-2">Connect not enabled</h3>
            <p className="text-gray-400 text-sm">
              This user hasn't set up their Connect profile yet
            </p>
          </>
        )}
      </div>
    );
  }

  const lookingForLabels: Record<string, string> = {
    friendship: 'Friendship',
    dating: 'Dating',
    networking: 'Networking',
    collaboration: 'Collaboration',
    open: 'Open to anything',
  };

  const statusLabels: Record<string, string> = {
    single: 'Single',
    taken: 'In a relationship',
    complicated: "It's complicated",
    open: 'Open relationship',
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Dating Bio */}
      {datingBio && (
        <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-2xl p-4 border border-pink-500/20">
          <p className="text-gray-200 text-sm leading-relaxed">{datingBio}</p>
        </div>
      )}

      {/* Quick Info */}
      <div className="flex flex-wrap gap-3">
        {age && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 rounded-full text-sm">
            <span className="text-gray-400">Age:</span>
            <span className="text-white">{age}</span>
          </div>
        )}
        {gender && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 rounded-full text-sm">
            <span className="text-white capitalize">{gender}</span>
          </div>
        )}
        {location && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 rounded-full text-sm">
            <MapPin className="h-3.5 w-3.5 text-pink-400" />
            <span className="text-white">{location}</span>
          </div>
        )}
      </div>

      {/* Looking For */}
      {lookingFor && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">Looking for</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lookingFor.split(',').map((item) => (
              <span
                key={item}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm"
              >
                {lookingForLabels[item.trim()] || item.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Relationship Status */}
      {relationshipStatus && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-pink-400" />
            <span className="text-sm font-medium text-gray-300">Relationship status</span>
          </div>
          <span className="px-3 py-1.5 bg-pink-500/20 text-pink-300 rounded-full text-sm">
            {statusLabels[relationshipStatus] || relationshipStatus}
          </span>
        </div>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-gray-300">Interests</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <span
                key={interest}
                className="px-3 py-1.5 bg-gray-800/50 text-gray-200 rounded-full text-sm border border-gray-700"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Edit Button for own profile */}
      {isOwnProfile && (
        <div className="pt-4">
          <Button
            onClick={onEditClick}
            variant="outline"
            className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
          >
            Edit Connect Profile
          </Button>
        </div>
      )}

      {/* Connect Button for other profiles */}
      {!isOwnProfile && (
        <div className="pt-4">
          <Button
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
          >
            <Heart className="h-4 w-4 mr-2" />
            Send Interest
          </Button>
        </div>
      )}
    </div>
  );
}
