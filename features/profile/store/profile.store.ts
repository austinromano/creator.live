/**
 * Profile UI Store (Zustand)
 * Client-side state for profile UI interactions
 */

import { create } from 'zustand';
import type { ProfileTab, ProfilePost } from '../types/profile.types';

interface ProfileUIState {
  // Tab state
  activeTab: ProfileTab;
  setActiveTab: (tab: ProfileTab) => void;

  // Post detail modal
  selectedPost: ProfilePost | null;
  setSelectedPost: (post: ProfilePost | null) => void;

  // Edit profile modal
  showEditProfile: boolean;
  setShowEditProfile: (show: boolean) => void;

  // Create post modal
  showCreatePost: boolean;
  setShowCreatePost: (show: boolean) => void;

  // Settings dropdown
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  // Reset all modals (useful when navigating away)
  resetModals: () => void;
}

export const useProfileStore = create<ProfileUIState>((set) => ({
  // Tab state
  activeTab: 'posts',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Post detail modal
  selectedPost: null,
  setSelectedPost: (post) => set({ selectedPost: post }),

  // Edit profile modal
  showEditProfile: false,
  setShowEditProfile: (show) => set({ showEditProfile: show }),

  // Create post modal
  showCreatePost: false,
  setShowCreatePost: (show) => set({ showCreatePost: show }),

  // Settings dropdown
  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),

  // Reset all modals
  resetModals: () =>
    set({
      selectedPost: null,
      showEditProfile: false,
      showCreatePost: false,
      showSettings: false,
    }),
}));
