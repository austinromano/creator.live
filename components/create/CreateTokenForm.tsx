'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/hooks/useWallet';
import { useTokenStore } from '@/stores/tokenStore';
import { PLATFORM_CONFIG, SOCIAL_PLATFORMS } from '@/lib/constants';
import { 
  Upload, 
  Wallet, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Twitter,
  Globe,
  MessageCircle,
  Sparkles
} from 'lucide-react';

interface TokenFormData {
  name: string;
  symbol: string;
  description: string;
  image: string;
  twitter?: string;
  website?: string;
  telegram?: string;
}

export function CreateTokenForm() {
  const router = useRouter();
  const { isConnected, balance, connect } = useWallet();
  const { addToken, getTokenBySymbol } = useTokenStore();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<TokenFormData>({
    name: '',
    symbol: '',
    description: '',
    image: '',
  });
  const [errors, setErrors] = useState<Partial<TokenFormData>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const validateForm = (): boolean => {
    const newErrors: Partial<TokenFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Token name is required';
    } else if (formData.name.length > 32) {
      newErrors.name = 'Token name must be 32 characters or less';
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required';
    } else if (formData.symbol.length > 10) {
      newErrors.symbol = 'Token symbol must be 10 characters or less';
    } else if (!/^[A-Za-z0-9]+$/.test(formData.symbol)) {
      newErrors.symbol = 'Token symbol can only contain letters and numbers';
    } else if (getTokenBySymbol(formData.symbol)) {
      newErrors.symbol = 'Token symbol already exists. Please choose a different symbol.';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 300) {
      newErrors.description = 'Description must be 300 characters or less';
    }

    if (!imageFile && !imagePreview) {
      newErrors.image = 'Token image is required';
    }

    // Validate URLs if provided
    const urlPattern = /^https?:\/\/.+/;
    if (formData.twitter && !urlPattern.test(formData.twitter)) {
      newErrors.twitter = 'Invalid Twitter URL';
    }
    if (formData.website && !urlPattern.test(formData.website)) {
      newErrors.website = 'Invalid website URL';
    }
    if (formData.telegram && !urlPattern.test(formData.telegram)) {
      newErrors.telegram = 'Invalid Telegram URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: keyof TokenFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      connect();
      return;
    }

    if (balance < PLATFORM_CONFIG.creationFee) {
      alert(`Insufficient balance. You need ${PLATFORM_CONFIG.creationFee} SOL to create a token.`);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    
    try {
      // Simulate token creation process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create the new token
      const newToken = addToken({
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        description: formData.description,
        avatar: imagePreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.symbol}`,
        isLive: false,
        twitter: formData.twitter,
        website: formData.website,
        telegram: formData.telegram,
      });

      console.log('Token created successfully:', newToken);
      
      // Redirect to the new token page
      router.push(`/token/${newToken.symbol}`);
    } catch (error) {
      console.error('Failed to create token:', error);
      alert('Failed to create token. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const canCreate = isConnected && balance >= PLATFORM_CONFIG.creationFee;

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span>Create Your Token</span>
        </CardTitle>
        <p className="text-gray-400">
          Deploy your creator token for just {PLATFORM_CONFIG.creationFee} SOL
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Image */}
          <div className="space-y-2">
            <Label className="text-white">Token Image *</Label>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20 border-2 border-dashed border-gray-600">
                <AvatarImage src={imagePreview} />
                <AvatarFallback className="bg-gray-800">
                  <Upload className="h-6 w-6 text-gray-400" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Label 
                  htmlFor="image-upload" 
                  className="cursor-pointer inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 400x400px, PNG or JPG, max 2MB
                </p>
              </div>
            </div>
            {errors.image && (
              <p className="text-red-400 text-sm flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.image}</span>
              </p>
            )}
          </div>

          {/* Token Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Token Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Luna Rivers Token"
              className="bg-gray-800 border-gray-600 text-white"
              maxLength={32}
            />
            <div className="flex justify-between text-xs">
              <span className={errors.name ? 'text-red-400' : 'text-gray-500'}>
                {errors.name || 'The name of your token'}
              </span>
              <span className="text-gray-500">
                {formData.name.length}/32
              </span>
            </div>
          </div>

          {/* Token Symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol" className="text-white">Token Symbol *</Label>
            <Input
              id="symbol"
              value={formData.symbol}
              onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
              placeholder="e.g., LUNA"
              className="bg-gray-800 border-gray-600 text-white font-mono"
              maxLength={10}
            />
            <div className="flex justify-between text-xs">
              <span className={errors.symbol ? 'text-red-400' : 'text-gray-500'}>
                {errors.symbol || 'Short identifier for your token'}
              </span>
              <span className="text-gray-500">
                {formData.symbol.length}/10
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Tell people about your token and what makes you special as a creator..."
              className="bg-gray-800 border-gray-600 text-white min-h-[100px] resize-none"
              maxLength={300}
            />
            <div className="flex justify-between text-xs">
              <span className={errors.description ? 'text-red-400' : 'text-gray-500'}>
                {errors.description || 'Describe your token and community'}
              </span>
              <span className="text-gray-500">
                {formData.description.length}/300
              </span>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <Label className="text-white">Social Links (Optional)</Label>
            
            <div className="space-y-3">
              {/* Twitter */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Twitter className="h-4 w-4" />
                  <span>Twitter</span>
                </div>
                <Input
                  value={formData.twitter || ''}
                  onChange={(e) => handleInputChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/yourusername"
                  className="bg-gray-800 border-gray-600 text-white"
                />
                {errors.twitter && (
                  <p className="text-red-400 text-xs">{errors.twitter}</p>
                )}
              </div>

              {/* Website */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Globe className="h-4 w-4" />
                  <span>Website</span>
                </div>
                <Input
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="bg-gray-800 border-gray-600 text-white"
                />
                {errors.website && (
                  <p className="text-red-400 text-xs">{errors.website}</p>
                )}
              </div>

              {/* Telegram */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <MessageCircle className="h-4 w-4" />
                  <span>Telegram</span>
                </div>
                <Input
                  value={formData.telegram || ''}
                  onChange={(e) => handleInputChange('telegram', e.target.value)}
                  placeholder="https://t.me/yourchannel"
                  className="bg-gray-800 border-gray-600 text-white"
                />
                {errors.telegram && (
                  <p className="text-red-400 text-xs">{errors.telegram}</p>
                )}
              </div>
            </div>
          </div>

          {/* Cost Information */}
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Creation Cost:</span>
              <span className="text-white font-semibold">{PLATFORM_CONFIG.creationFee} SOL</span>
            </div>
            {isConnected && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Your Balance:</span>
                <span className={`font-semibold ${balance >= PLATFORM_CONFIG.creationFee ? 'text-green-400' : 'text-red-400'}`}>
                  {balance.toFixed(4)} SOL
                  {balance >= PLATFORM_CONFIG.creationFee ? (
                    <CheckCircle className="inline h-4 w-4 ml-1" />
                  ) : (
                    <AlertCircle className="inline h-4 w-4 ml-1" />
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!canCreate || isCreating}
            className="w-full py-6 text-lg font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {!isConnected ? (
              <>
                <Wallet className="h-5 w-5 mr-2" />
                Connect Wallet to Create
              </>
            ) : isCreating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Creating Token...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Create Token ({PLATFORM_CONFIG.creationFee} SOL)
              </>
            )}
          </Button>

          {!isConnected && (
            <p className="text-center text-sm text-gray-400">
              Connect your wallet to deploy your creator token
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}