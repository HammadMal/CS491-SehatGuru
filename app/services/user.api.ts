import apiClient from './api';
import { OnboardingData } from '../types/onboarding.types';

/**
 * User Profile API service
 * All user profile and onboarding-related API calls
 */

export interface UserProfileRequest {
  basic_info: {
    full_name: string;
    height: string;
    height_unit: 'cm' | 'ft';
    weight: string;
    weight_unit: 'kg' | 'lbs';
    age: string;
    gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | '';
  };
  activity_level: string;
  health_goals: string[];
  meal_preferences: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    snacks: boolean;
  };
  dietary_preferences: {
    vegetarian: boolean;
    vegan: boolean;
    gluten_free: boolean;
    other: string;
  };
}

export interface UserProfileResponse {
  uid: string;
  basic_info: {
    full_name: string;
    height: string;
    height_unit: 'cm' | 'ft';
    weight: string;
    weight_unit: 'kg' | 'lbs';
    age: string;
    gender: string;
  };
  activity_level: string;
  health_goals: string[];
  meal_preferences: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    snacks: boolean;
  };
  dietary_preferences: {
    vegetarian: boolean;
    vegan: boolean;
    gluten_free: boolean;
    other: string;
  };
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OnboardingStatusResponse {
  uid: string;
  onboarding_completed: boolean;
}

/**
 * Convert app onboarding data to backend format
 */
const convertOnboardingDataToBackend = (data: OnboardingData): UserProfileRequest => {
  return {
    basic_info: {
      full_name: data.basicInfo.fullName,
      height: data.basicInfo.height,
      height_unit: data.basicInfo.heightUnit,
      weight: data.basicInfo.weight,
      weight_unit: data.basicInfo.weightUnit,
      age: data.basicInfo.age,
      gender: data.basicInfo.gender,
    },
    activity_level: data.activityLevel,
    health_goals: data.healthGoals,
    meal_preferences: {
      breakfast: data.mealPreferences.breakfast,
      lunch: data.mealPreferences.lunch,
      dinner: data.mealPreferences.dinner,
      snacks: data.mealPreferences.snacks,
    },
    dietary_preferences: {
      vegetarian: data.dietaryPreferences.vegetarian,
      vegan: data.dietaryPreferences.vegan,
      gluten_free: data.dietaryPreferences.glutenFree,
      other: data.dietaryPreferences.other,
    },
  };
};

/**
 * Convert backend profile data to app format
 */
const convertBackendDataToApp = (data: UserProfileResponse): OnboardingData => {
  return {
    basicInfo: {
      fullName: data.basic_info.full_name,
      height: data.basic_info.height,
      heightUnit: data.basic_info.height_unit,
      weight: data.basic_info.weight,
      weightUnit: data.basic_info.weight_unit,
      age: data.basic_info.age,
      gender: data.basic_info.gender as any,
    },
    activityLevel: data.activity_level as any,
    healthGoals: data.health_goals as any,
    mealPreferences: {
      breakfast: data.meal_preferences.breakfast,
      lunch: data.meal_preferences.lunch,
      dinner: data.meal_preferences.dinner,
      snacks: data.meal_preferences.snacks,
    },
    dietaryPreferences: {
      vegetarian: data.dietary_preferences.vegetarian,
      vegan: data.dietary_preferences.vegan,
      glutenFree: data.dietary_preferences.gluten_free,
      other: data.dietary_preferences.other,
    },
  };
};

export const userAPI = {
  /**
   * Save user profile/onboarding data
   */
  saveProfile: async (data: OnboardingData): Promise<UserProfileResponse> => {
    const backendData = convertOnboardingDataToBackend(data);
    const response = await apiClient.post('/api/user/profile', backendData);
    return response.data;
  },

  /**
   * Get user profile data
   */
  getProfile: async (): Promise<OnboardingData | null> => {
    try {
      const response = await apiClient.get('/api/user/profile');
      return convertBackendDataToApp(response.data);
    } catch (error: any) {
      // Return null if profile not found (404)
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Update user profile (partial update)
   */
  updateProfile: async (data: Partial<OnboardingData>): Promise<UserProfileResponse> => {
    // Convert partial data to backend format
    const backendData: any = {};

    if (data.basicInfo) {
      backendData.basic_info = {
        full_name: data.basicInfo.fullName,
        height: data.basicInfo.height,
        height_unit: data.basicInfo.heightUnit,
        weight: data.basicInfo.weight,
        weight_unit: data.basicInfo.weightUnit,
        age: data.basicInfo.age,
        gender: data.basicInfo.gender,
      };
    }

    if (data.activityLevel) {
      backendData.activity_level = data.activityLevel;
    }

    if (data.healthGoals) {
      backendData.health_goals = data.healthGoals;
    }

    if (data.mealPreferences) {
      backendData.meal_preferences = {
        breakfast: data.mealPreferences.breakfast,
        lunch: data.mealPreferences.lunch,
        dinner: data.mealPreferences.dinner,
        snacks: data.mealPreferences.snacks,
      };
    }

    if (data.dietaryPreferences) {
      backendData.dietary_preferences = {
        vegetarian: data.dietaryPreferences.vegetarian,
        vegan: data.dietaryPreferences.vegan,
        gluten_free: data.dietaryPreferences.glutenFree,
        other: data.dietaryPreferences.other,
      };
    }

    const response = await apiClient.patch('/api/user/profile', backendData);
    return response.data;
  },

  /**
   * Check onboarding status
   */
  getOnboardingStatus: async (): Promise<OnboardingStatusResponse> => {
    const response = await apiClient.get('/api/user/onboarding-status');
    return response.data;
  },
};

export default userAPI;
