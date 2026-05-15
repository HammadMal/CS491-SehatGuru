import apiClient from './api';
import type { ChatResponse, ChatRequest, UserContext } from '../types/chat.types';

/**
 * Chat API service
 * All chatbot-related API calls with RAG integration
 */

export const chatAPI = {
  /**
   * Send a message to the chatbot and get a RAG-enhanced response
   * @param message - User's message
   * @param userContext - Optional user context for personalized responses
   * @param useRag - Whether to use RAG (default true)
   * @param chatHistory - Optional session history (last N messages)
   */
  sendMessage: async (
    message: string,
    userContext?: UserContext,
    useRag: boolean = true,
    chatHistory?: { role: string; content: string }[],
  ): Promise<ChatResponse> => {
    const body: any = { message, use_rag: useRag };
    if (userContext) body.user_context = userContext;
    if (chatHistory?.length) body.chat_history = chatHistory;
    const response = await apiClient.post('/api/chat/message/with-history', body);
    return response.data;
  },

  /**
   * Build user context from onboarding data
   * Helper function to convert app's onboarding data to API format
   */
  buildUserContext: (onboardingData: {
    basicInfo?: {
      age?: string;
      gender?: string;
      height?: string;
      heightUnit?: 'cm' | 'ft';
      weight?: string;
      weightUnit?: 'kg' | 'lbs';
    };
    activityLevel?: string;
    healthGoals?: string[];
    dietaryPreferences?: {
      vegetarian?: boolean;
      vegan?: boolean;
      glutenFree?: boolean;
      other?: string;
    };
  }, dailyCalorieGoal?: number): UserContext => {
    const context: UserContext = {};

    // Add name
    if (onboardingData.basicInfo?.fullName) {
      context.name = onboardingData.basicInfo.fullName;
    }

    // Add health goals
    if (onboardingData.healthGoals && onboardingData.healthGoals.length > 0) {
      context.health_goals = onboardingData.healthGoals;
    }

    // Add age
    if (onboardingData.basicInfo?.age) {
      const age = parseInt(onboardingData.basicInfo.age, 10);
      if (!isNaN(age)) {
        context.age = age;
      }
    }

    // Add gender
    if (onboardingData.basicInfo?.gender) {
      context.gender = onboardingData.basicInfo.gender;
    }

    // Add weight (convert lbs → kg if needed)
    if (onboardingData.basicInfo?.weight) {
      const w = parseFloat(onboardingData.basicInfo.weight);
      if (!isNaN(w)) {
        context.weight_kg = onboardingData.basicInfo.weightUnit === 'lbs'
          ? Math.round(w * 0.453592 * 10) / 10
          : w;
      }
    }

    // Add height (convert ft → cm if needed)
    if (onboardingData.basicInfo?.height) {
      const h = parseFloat(onboardingData.basicInfo.height);
      if (!isNaN(h)) {
        context.height_cm = onboardingData.basicInfo.heightUnit === 'ft'
          ? Math.round(h * 30.48 * 10) / 10
          : h;
      }
    }

    // Add activity level
    if (onboardingData.activityLevel) {
      context.activity_level = onboardingData.activityLevel;
    }

    // Build dietary restrictions from preferences
    const restrictions: string[] = [];
    if (onboardingData.dietaryPreferences) {
      if (onboardingData.dietaryPreferences.vegetarian) {
        restrictions.push('vegetarian');
      }
      if (onboardingData.dietaryPreferences.vegan) {
        restrictions.push('vegan');
      }
      if (onboardingData.dietaryPreferences.glutenFree) {
        restrictions.push('gluten_free');
      }
      if (onboardingData.dietaryPreferences.other) {
        restrictions.push(onboardingData.dietaryPreferences.other);
      }
      // Medical conditions (from manage-condition goal)
      const conditions = onboardingData.dietaryPreferences.medicalConditions;
      if (conditions && conditions.length > 0) {
        restrictions.push(...conditions);
      }
    }
    if (restrictions.length > 0) {
      context.dietary_restrictions = restrictions;
    }

    // Build meal preferences list; default to all meals if none selected
    if (onboardingData.mealPreferences) {
      const meals: string[] = [];
      if (onboardingData.mealPreferences.breakfast) meals.push('breakfast');
      if (onboardingData.mealPreferences.lunch) meals.push('lunch');
      if (onboardingData.mealPreferences.dinner) meals.push('dinner');
      if (onboardingData.mealPreferences.snacks) meals.push('snacks');
      context.meal_preferences = meals.length > 0 ? meals : ['breakfast', 'lunch', 'dinner', 'snacks'];
    }

    if (dailyCalorieGoal) {
      context.daily_calorie_target = dailyCalorieGoal;
    }

    return context;
  },
};

export default chatAPI;
