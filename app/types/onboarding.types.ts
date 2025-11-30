export interface BasicInfo {
  fullName: string;
  height: string;
  heightUnit: 'cm' | 'ft';
  weight: string;
  weightUnit: 'kg' | 'lbs';
  age: string;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | '';
}

export type ActivityLevel =
  | 'sedentary'
  | 'lightly-active'
  | 'moderately-active'
  | 'very-active'
  | 'extra-active'
  | '';

export type HealthGoal =
  | 'lose-weight'
  | 'maintain-weight'
  | 'gain-weight'
  | 'build-muscle'
  | 'improve-health'
  | 'manage-condition';

export interface MealPreferences {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  snacks: boolean;
}

export interface DietaryPreferences {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  other: string;
}

export interface OnboardingData {
  basicInfo: BasicInfo;
  activityLevel: ActivityLevel;
  healthGoals: HealthGoal[];
  mealPreferences: MealPreferences;
  dietaryPreferences: DietaryPreferences;
}

export interface OnboardingContextType {
  // State
  onboardingData: OnboardingData;
  currentStep: number;

  // Actions
  updateBasicInfo: (data: BasicInfo) => void;
  updateActivityLevel: (level: ActivityLevel) => void;
  updateHealthGoals: (goals: HealthGoal[]) => void;
  updateMealPreferences: (preferences: MealPreferences) => void;
  updateDietaryPreferences: (preferences: DietaryPreferences) => void;
  completeOnboarding: () => Promise<void>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  resetOnboarding: () => void;
}
