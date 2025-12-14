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
  source: "camera" | "manual";
  createdAt: string;
}
