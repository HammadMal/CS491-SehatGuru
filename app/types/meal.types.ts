export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface Meal {
  id: string;
  userId: string;
  foodName: string;
  mealType: MealType;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "camera" | "manual" | "chatbot";
  createdAt: string;
}

export interface MealPlanItem {
  id: string;
  userId: string;
  planId: string;
  foodName: string;
  mealType: MealType;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged: boolean;
  createdAt: string;
}
