import apiClient from './api';
import type { ChatResponse } from '../types/chat.types';

/**
 * Chat API service
 * All chatbot-related API calls
 */

export const chatAPI = {
  /**
   * Send a message to the chatbot and get a response
   */
  sendMessage: async (message: string): Promise<ChatResponse> => {
    const response = await apiClient.post('/api/chat/message', { message });
    return response.data;
  },
};

export default chatAPI;
