'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '@/lib/types';

export type AuthProvider = 'phantom' | 'google' | null;

interface AuthUser {
  id: string;
  email?: string;
  username: string;
  avatar?: string;
  provider: AuthProvider;
  walletAddress?: string;
  createdAt: string;
  profile: UserProfile;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showAuthModal: boolean;

  // Actions
  login: (provider: AuthProvider, userData: Partial<AuthUser>) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setShowAuthModal: (show: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      showAuthModal: false,

      login: async (provider: AuthProvider, userData: Partial<AuthUser>) => {
        set({ isLoading: true });

        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const user: AuthUser = {
            id: userData.id || `user_${Date.now()}`,
            email: userData.email,
            username: userData.username || `user_${Date.now().toString().slice(-6)}`,
            avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.id}`,
            provider: provider!,
            walletAddress: userData.walletAddress,
            createdAt: new Date().toISOString(),
            profile: userData.profile || {
              address: userData.walletAddress || userData.id || '',
              username: userData.username,
              avatar: userData.avatar,
              bio: '',
              following: [],
              followers: [],
              tokensCreated: [],
              tokensHeld: [],
              achievements: [],
              reputation: 0,
            },
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            showAuthModal: false,
          });
        } catch (error) {
          console.error('Login failed:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      updateProfile: (updates: Partial<UserProfile>) => {
        const currentUser = get().user;
        if (!currentUser) return;

        set({
          user: {
            ...currentUser,
            profile: {
              ...currentUser.profile,
              ...updates,
            },
          },
        });
      },

      setShowAuthModal: (show: boolean) => {
        set({ showAuthModal: show });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
