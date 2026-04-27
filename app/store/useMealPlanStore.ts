import { create } from "zustand";
import type { MealPlanItem } from "../types/meal.types";

type MealPlanState = {
  planItems: MealPlanItem[];
  setPlanItems: (items: MealPlanItem[]) => void;
  addPlanItems: (items: MealPlanItem[]) => void;
  markLogged: (id: string) => void;
  removePlan: (planId: string) => void;
  clearPlanItems: () => void;
};

export const useMealPlanStore = create<MealPlanState>((set) => ({
  planItems: [],

  setPlanItems: (items) => set({ planItems: items }),

  addPlanItems: (items) =>
    set((state) => ({ planItems: [...items, ...state.planItems] })),

  markLogged: (id) =>
    set((state) => ({
      planItems: state.planItems.map((item) =>
        item.id === id ? { ...item, logged: true } : item
      ),
    })),

  removePlan: (planId) =>
    set((state) => ({
      planItems: state.planItems.filter((item) => item.planId !== planId),
    })),

  clearPlanItems: () => set({ planItems: [] }),
}));
