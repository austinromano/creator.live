'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, Camera, Sparkles, Upload } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        router.push('/');
        return;
      }

      try {
        const response = await fetch('/api/user/me');
        const data = await response.json();

        if (data.user?.hasCompletedOnboarding) {
          // Already onboarded, redirect to golive
          router.push('/golive');
          return;
        }

        // Pre-fill username if exists
        if (data.user?.username) {
          setUsername(data.user.username);
        }

        // Pre-fill avatar if exists
        if (data.user?.avatar) {
          setImageUrl(data.user.avatar);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsLoading(false);
      }
    };

    checkOnboarding();
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          image: imageUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to complete onboarding');
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to golive
      router.push('/golive');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setImageUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('File too large. Maximum size is 2MB.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to upload image');
        return;
      }

      setImageUrl(data.avatar);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">Welcome to creator.fun!</CardTitle>
          <CardDescription className="text-gray-400">
            Let's set up your profile so you can start streaming
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-24 w-24 border-4 border-purple-500">
                <AvatarImage src={imageUrl} alt="Profile" />
                <AvatarFallback className="bg-gray-800 text-gray-400">
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={triggerFileUpload}
                  disabled={isUploading}
                  className="border-gray-700 text-gray-300 hover:text-white"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateRandomAvatar}
                  disabled={isUploading}
                  className="border-gray-700 text-gray-300 hover:text-white"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
            </div>

            {/* Username Input */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                minLength={3}
                maxLength={20}
                required
              />
              <p className="text-xs text-gray-500">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            {/* Optional Avatar URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-white">
                Avatar URL <span className="text-gray-500">(optional)</span>
              </Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/avatar.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-600 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || username.trim().length < 3}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
