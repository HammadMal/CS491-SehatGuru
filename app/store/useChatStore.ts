import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { Message, ChatSession } from '../types/chat.types';

const STORAGE_KEY = 'chat_sessions';
const MAX_SESSIONS = 5;

type ChatState = {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: Message[];
  isLoading: boolean;

  // Session actions
  initSessions: () => Promise<void>;
  createNewSession: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;

  // Message actions
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
};

const saveSessions = async (sessions: ChatSession[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save chat sessions:', e);
  }
};

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isLoading: false,

  initSessions: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const sessions: ChatSession[] = JSON.parse(raw);
        set({ sessions });
      }
    } catch (e) {
      console.error('Failed to load chat sessions:', e);
    }
  },

  createNewSession: () => {
    const { sessions, messages, currentSessionId } = get();

    // Save current session if it has messages
    let updatedSessions = [...sessions];
    if (currentSessionId && messages.length > 0) {
      updatedSessions = updatedSessions.map((s) =>
        s.id === currentSessionId
          ? { ...s, messages, updatedAt: new Date().toISOString() }
          : s
      );
    }

    // If no current session but messages exist, create one for them
    if (!currentSessionId && messages.length > 0) {
      const title =
        messages.find((m) => m.sender === 'user')?.content.slice(0, 35) ||
        'Chat';
      const orphan: ChatSession = {
        id: Crypto.randomUUID(),
        title: title.length === 35 ? title + '…' : title,
        messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedSessions = [orphan, ...updatedSessions];
    }

    // Enforce max 5 — drop oldest
    if (updatedSessions.length >= MAX_SESSIONS) {
      updatedSessions = updatedSessions.slice(0, MAX_SESSIONS);
    }

    saveSessions(updatedSessions);
    set({ sessions: updatedSessions, currentSessionId: null, messages: [] });
  },

  loadSession: (id: string) => {
    const { sessions, messages, currentSessionId } = get();

    // Save current session first
    let updatedSessions = [...sessions];
    if (currentSessionId && messages.length > 0) {
      updatedSessions = updatedSessions.map((s) =>
        s.id === currentSessionId
          ? { ...s, messages, updatedAt: new Date().toISOString() }
          : s
      );
    }

    const session = updatedSessions.find((s) => s.id === id);
    if (!session) return;

    saveSessions(updatedSessions);
    set({
      sessions: updatedSessions,
      currentSessionId: id,
      messages: session.messages,
    });
  },

  deleteSession: (id: string) => {
    const { sessions, currentSessionId } = get();
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);

    if (currentSessionId === id) {
      set({ sessions: updated, currentSessionId: null, messages: [] });
    } else {
      set({ sessions: updated });
    }
  },

  addMessage: (message: Message) => {
    set((state) => {
      const newMessages = [...state.messages, message];
      let { sessions, currentSessionId } = state;

      // Auto-create a session on first user message
      if (!currentSessionId && message.sender === 'user') {
        const title =
          message.content.slice(0, 35) +
          (message.content.length > 35 ? '…' : '');
        const newSession: ChatSession = {
          id: Crypto.randomUUID(),
          title,
          messages: newMessages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Check if this session already exists (avoid duplication)
        let updatedSessions = [newSession, ...sessions];
        if (updatedSessions.length > MAX_SESSIONS) {
          updatedSessions = updatedSessions.slice(0, MAX_SESSIONS);
        }

        saveSessions(updatedSessions);
        return {
          messages: newMessages,
          sessions: updatedSessions,
          currentSessionId: newSession.id,
        };
      }

      // Update existing session
      if (currentSessionId) {
        const updatedSessions = sessions.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: newMessages, updatedAt: new Date().toISOString() }
            : s
        );
        saveSessions(updatedSessions);
        return { messages: newMessages, sessions: updatedSessions };
      }

      return { messages: newMessages };
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  clearMessages: () => set({ messages: [], currentSessionId: null }),
}));
