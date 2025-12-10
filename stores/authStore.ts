'use client';

import { create } from 'zustand';

/**
 * Auth UI store - manages auth modal visibility
 * Note: Actual authentication state is managed by NextAuth (useSession)
 */
interface AuthUIState {
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

export const useAuthStore = create<AuthUIState>((set) => ({
  showAuthModal: false,
  setShowAuthModal: (show) => set({ showAuthModal: show }),
}));
