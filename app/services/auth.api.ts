import apiClient from './api';
import { User } from '../types/auth.types';

/**
 * Authentication API service
 * All authentication-related API calls
 */

export interface RegisterResponse {
  uid: string;
  email: string;
  full_name: string;
  email_verified: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  uid: string;
  email: string;
  full_name?: string;
  email_verified: boolean;
  created_at?: string;
  photo_url?: string;
}

export interface MessageResponse {
  message: string;
  success: boolean;
}

export const authAPI = {
  /**
   * Register a new user
   */
  register: async (email: string, password: string, fullName: string): Promise<RegisterResponse> => {
    const response = await apiClient.post('/api/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Authenticate with Google OAuth
   */
  googleAuth: async (idToken: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/api/auth/google', {
      id_token: idToken,
    });
    return response.data;
  },

  /**
   * Get current user information
   */
  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  /**
   * Request password reset (sends OTP to email)
   */
  forgotPassword: async (email: string): Promise<MessageResponse> => {
    const response = await apiClient.post('/api/auth/forgot-password', {
      email,
    });
    return response.data;
  },

  /**
   * Verify OTP for password reset
   */
  verifyResetOTP: async (email: string, otp: string): Promise<MessageResponse> => {
    const response = await apiClient.post('/api/auth/verify-reset-otp', {
      email,
      otp,
    });
    return response.data;
  },

  /**
   * Reset password with OTP
   */
  resetPasswordWithOTP: async (
    email: string,
    otp: string,
    newPassword: string
  ): Promise<MessageResponse> => {
    const response = await apiClient.post('/api/auth/reset-password-otp', {
      email,
      otp,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Logout (invalidate current token)
   */
  logout: async (): Promise<MessageResponse> => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (): Promise<LoginResponse> => {
    const response = await apiClient.post('/api/auth/refresh');
    return response.data;
  },

  /**
   * Request email verification
   */
  requestEmailVerification: async (email: string): Promise<MessageResponse> => {
    const response = await apiClient.post('/api/auth/verify-email', {
      email,
    });
    return response.data;
  },

  /**
   * Delete user account
   */
  deleteAccount: async (): Promise<MessageResponse> => {
    const response = await apiClient.delete('/api/auth/delete-account');
    return response.data;
  },

  /**
   * Delete user by email (admin endpoint for development)
   */
  deleteUserByEmail: async (email: string): Promise<MessageResponse> => {
    const response = await apiClient.delete(`/api/auth/admin/delete-user-by-email/${email}`);
    return response.data;
  },
};

export default authAPI;
