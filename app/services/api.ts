import axios from 'axios';
import { CONFIG } from '../config';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: CONFIG.apiBaseUrl,
  timeout: CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service functions
export const api = {
  // Health check endpoint
  healthCheck: async () => {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add your other API calls here
  // Example:
  // login: async (email: string, password: string) => {
  //   const response = await apiClient.post('/auth/login', { email, password });
  //   return response.data;
  // },
};

export default apiClient;
