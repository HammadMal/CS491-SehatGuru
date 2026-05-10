import { create } from "zustand";
import type { GamificationData } from "../types/gamification.types";

type GamificationState = {
  data: GamificationData | null;
  hydrated: boolean;
  setData: (data: GamificationData) => void;
  clearData: () => void;
};

export const useGamificationStore = create<GamificationState>((set) => ({
  data: null,
  hydrated: false,
  setData: (data) => set({ data, hydrated: true }),
  clearData: () => set({ data: null, hydrated: false }),
}));
