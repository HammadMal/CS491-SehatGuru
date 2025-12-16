import { create } from "zustand";
import type { Message } from "../types/chat.types";

type ChatState = {
  messages: Message[];
  isLoading: boolean;
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),

  clearMessages: () =>
    set({
      messages: [],
    }),
}));
