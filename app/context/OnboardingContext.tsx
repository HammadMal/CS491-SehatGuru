import React, { createContext, useState, ReactNode, useContext } from 'react';
import {
  OnboardingContextType,
  OnboardingData,
  BasicInfo,
  ActivityLevel,
  HealthGoal,
  MealPreferences,
  DietaryPreferences,
} from '../types/onboarding.types';
import { setObject, setItem, STORAGE_KEYS } from '../utils/storage';
import { AuthContext } from './AuthContext';

export const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

const initialOnboardingData: OnboardingData = {
  basicInfo: {
    fullName: '',
    height: '',
    heightUnit: 'cm',
    weight: '',
    weightUnit: 'kg',
    age: '',
    gender: '',
  },
  activityLevel: '',
  healthGoals: [],
  mealPreferences: {
    breakfast: false,
    lunch: false,
    dinner: false,
    snacks: false,
  },
  dietaryPreferences: {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    other: '',
  },
};

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(initialOnboardingData);
  const [currentStep, setCurrentStep] = useState(0);
  const authContext = useContext(AuthContext);

  const updateBasicInfo = (data: BasicInfo) => {
    setOnboardingData((prev) => ({
      ...prev,
      basicInfo: data,
    }));
  };

  const updateActivityLevel = (level: ActivityLevel) => {
    setOnboardingData((prev) => ({
      ...prev,
      activityLevel: level,
    }));
  };

  const updateHealthGoals = (goals: HealthGoal[]) => {
    setOnboardingData((prev) => ({
      ...prev,
      healthGoals: goals,
    }));
  };

  const updateMealPreferences = (preferences: MealPreferences) => {
    setOnboardingData((prev) => ({
      ...prev,
      mealPreferences: preferences,
    }));
  };

  const updateDietaryPreferences = (preferences: DietaryPreferences) => {
    setOnboardingData((prev) => ({
      ...prev,
      dietaryPreferences: preferences,
    }));
  };

  const completeOnboarding = async () => {
    try {
      // Save onboarding data
      await setObject(STORAGE_KEYS.ONBOARDING_DATA, onboardingData);
      await setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');

      // Refresh auth context to update hasCompletedOnboarding
      if (authContext && authContext.refreshOnboardingStatus) {
        await authContext.refreshOnboardingStatus();
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  };

  const goToNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3)); // Max 4 steps (0-3)
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const resetOnboarding = () => {
    setOnboardingData(initialOnboardingData);
    setCurrentStep(0);
  };

  const value: OnboardingContextType = {
    onboardingData,
    currentStep,
    updateBasicInfo,
    updateActivityLevel,
    updateHealthGoals,
    updateMealPreferences,
    updateDietaryPreferences,
    completeOnboarding,
    goToNextStep,
    goToPreviousStep,
    resetOnboarding,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};
