import { create } from "zustand";
import type { Meal } from "../types/meal.types";

type MealState = {
  meals: Meal[];
  hydrated: boolean;
  addMeal: (meal: Meal) => void;
  setMeals: (meals: Meal[]) => void;
  clearMeals: () => void;
};

export const useMealStore = create<MealState>((set) => ({
  meals: [],
  hydrated: false,

  addMeal: (meal) =>
    set((state) => ({
      meals: [meal, ...state.meals],
    })),

  setMeals: (meals) =>
    set({
      meals,
      hydrated: true,
    }),

  clearMeals: () =>
    set({
      meals: [],
      hydrated: false,
    }),
}));
