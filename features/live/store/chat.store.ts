/**
 * Chat Store (Zustand)
 * State management for chat messages and activity events during live streams
 */

import { create } from 'zustand';
import type { LiveChatMessage, LiveActivityEvent } from '../types/stream.types';

interface ChatState {
  // Chat messages
  messages: LiveChatMessage[];
  chatInput: string;

  // Activity events (likes, follows, tips, joins)
  activityEvents: LiveActivityEvent[];

  // Actions
  addMessage: (message: LiveChatMessage) => void;
  setChatInput: (input: string) => void;
  clearMessages: () => void;

  addActivityEvent: (event: LiveActivityEvent) => void;
  clearActivityEvents: () => void;

  // Clear all (when ending stream)
  clearAll: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  // Initial state
  messages: [],
  chatInput: '',
  activityEvents: [],

  // Message actions
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setChatInput: (chatInput) => set({ chatInput }),

  clearMessages: () => set({ messages: [] }),

  // Activity event actions
  addActivityEvent: (event) =>
    set((state) => ({
      activityEvents: [...state.activityEvents, event],
    })),

  clearActivityEvents: () => set({ activityEvents: [] }),

  // Clear all
  clearAll: () =>
    set({
      messages: [],
      chatInput: '',
      activityEvents: [],
    }),
}));
