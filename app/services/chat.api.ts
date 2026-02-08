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
   */
  sendMessage: async (
    message: string,
    userContext?: UserContext,
    useRag: boolean = true
  ): Promise<ChatResponse> => {
    const requestBody: ChatRequest = {
      message,
      use_rag: useRag,
    };

    // Add user context if provided
    if (userContext) {
      requestBody.user_context = userContext;
    }

    const response = await apiClient.post('/api/chat/message', requestBody);
    return response.data;
  },

  /**
   * Build user context from onboarding data
   * Helper function to convert app's onboarding data to API format
   */
  buildUserContext: (onboardingData: {
    basicInfo?: { age?: string; gender?: string };
    healthGoals?: string[];
    dietaryPreferences?: {
      vegetarian?: boolean;
      vegan?: boolean;
      glutenFree?: boolean;
      other?: string;
    };
  }): UserContext => {
    const context: UserContext = {};

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
    }
    if (restrictions.length > 0) {
      context.dietary_restrictions = restrictions;
    }

    return context;
  },
};

export default chatAPI;
