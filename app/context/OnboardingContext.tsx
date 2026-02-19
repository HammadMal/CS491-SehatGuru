import React, { createContext, useState, ReactNode, useContext, useEffect, useRef } from 'react';
import {
  OnboardingContextType,
  OnboardingData,
  BasicInfo,
  ActivityLevel,
  HealthGoal,
  MealPreferences,
  DietaryPreferences,
} from '../types/onboarding.types';
import { setObject, setItem, getObject, STORAGE_KEYS } from '../utils/storage';
import { AuthContext } from './AuthContext';
import { userAPI } from '../services/user.api';

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
  const previousUserIdRef = useRef<string | null>(null);

  // Load or reset onboarding data when user changes
  useEffect(() => {
    const currentUserId = authContext?.user?.id || null;

    // If user logged out (went from having an ID to null)
    if (previousUserIdRef.current !== null && currentUserId === null) {
      console.log('User logged out, resetting onboarding data');
      setOnboardingData(initialOnboardingData);
      setCurrentStep(0);
    }
    // If user changed (different user ID)
    else if (previousUserIdRef.current !== null && currentUserId !== null && previousUserIdRef.current !== currentUserId) {
      console.log('User changed, resetting onboarding data');
      setOnboardingData(initialOnboardingData);
      setCurrentStep(0);
    }
    // If user just logged in (went from null to having an ID), load their saved onboarding data
    else if (previousUserIdRef.current === null && currentUserId !== null) {
      getObject<OnboardingData>(STORAGE_KEYS.ONBOARDING_DATA).then(async (saved) => {
        if (saved && saved.basicInfo?.age) {
          console.log('Loaded onboarding data from AsyncStorage for user:', currentUserId);
          setOnboardingData(saved);
        } else {
          // AsyncStorage is empty or stale — fetch from backend
          try {
            const profile = await userAPI.getProfile();
            if (profile) {
              console.log('Loaded onboarding data from backend for user:', currentUserId);
              setOnboardingData(profile);
              // Cache it locally for next time
              await setObject(STORAGE_KEYS.ONBOARDING_DATA, profile);
            }
          } catch (error) {
            console.log('Could not load onboarding data from backend:', error);
          }
        }
      });
    }

    // Update the ref to track the current user
    previousUserIdRef.current = currentUserId;
  }, [authContext?.user?.id]);

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

  const completeOnboarding = async (finalMealPrefs?: MealPreferences, finalDietaryPrefs?: DietaryPreferences) => {
    try {
      // Use the most up-to-date data (either passed in or from state)
      const dataToSave: OnboardingData = {
        ...onboardingData,
        mealPreferences: finalMealPrefs || onboardingData.mealPreferences,
        dietaryPreferences: finalDietaryPrefs || onboardingData.dietaryPreferences,
      };

      console.log('Completing onboarding with data:', JSON.stringify(dataToSave, null, 2));

      // Save onboarding data to backend
      try {
        await userAPI.saveProfile(dataToSave);
        console.log('Onboarding data saved to backend successfully');
      } catch (apiError) {
        console.error('Error saving to backend:', apiError);
        // Continue with local save even if backend fails
        // This allows offline onboarding completion
      }

      // Save onboarding data locally (as backup)
      await setObject(STORAGE_KEYS.ONBOARDING_DATA, dataToSave);
      await setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');

      // Also mark consent as accepted since user completed onboarding
      // (user must have accepted consent to reach onboarding screens)
      await setItem(STORAGE_KEYS.CONSENT_ACCEPTED, 'true');

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
