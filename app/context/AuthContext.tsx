import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types/auth.types';
import { getItem, setItem, removeItem, getObject, setObject, STORAGE_KEYS } from '../utils/storage';
import { authAPI } from '../services/auth.api';
import { userAPI } from '../services/user.api';
import apiClient from '../services/api';
import { useChatStore } from '../store/useChatStore';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasAcceptedConsent, setHasAcceptedConsent] = useState(false);
  const [tempEmail, setTempEmail] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Check auth state on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await getObject<User>(STORAGE_KEYS.USER_PROFILE);
      const onboardingComplete = await getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      const consentAccepted = await getItem(STORAGE_KEYS.CONSENT_ACCEPTED);

      if (token && userData) {
        setIsAuthenticated(true);
        setUser(userData);

        const isOnboardingComplete = onboardingComplete === 'true';
        setHasCompletedOnboarding(isOnboardingComplete);

        // If onboarding is complete, consent must also be accepted
        // (users can't complete onboarding without accepting consent first)
        let isConsentAccepted = consentAccepted === 'true';
        if (isOnboardingComplete && !isConsentAccepted) {
          console.log('Onboarding completed but consent not set - fixing...');
          await setItem(STORAGE_KEYS.CONSENT_ACCEPTED, 'true');
          isConsentAccepted = true;
        }
        setHasAcceptedConsent(isConsentAccepted);

        // Validate token with backend
        try {
          const currentUser = await authAPI.getCurrentUser();
          // Update local user data with latest from backend
          const updatedUser: User = {
            id: currentUser.uid,
            email: currentUser.email,
            fullName: currentUser.full_name,
            emailVerified: currentUser.email_verified,
            photoUrl: currentUser.photo_url,
          };

          // Fetch user profile to get daily_calorie_goal from Firestore
          try {
            const profileResponse = await apiClient.get('/api/user/profile');
            if (profileResponse.data?.daily_calorie_goal) {
              updatedUser.daily_calorie_goal = profileResponse.data.daily_calorie_goal;
              console.log('Loaded daily calorie goal:', updatedUser.daily_calorie_goal);
            }
          } catch (profileError) {
            console.log('Could not fetch calorie goal from profile (may not have completed onboarding)');
          }

          setUser(updatedUser);
          await setObject(STORAGE_KEYS.USER_PROFILE, updatedUser);
        } catch (error) {
          // Token invalid, logout
          console.error('Token validation failed:', error);
          await logout();
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      // Call backend login API
      const response = await authAPI.login(email, password);

      // Store tokens
      await setItem(STORAGE_KEYS.AUTH_TOKEN, response.access_token);
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);

      // Get user data
      const userData = await authAPI.getCurrentUser();

      const user: User = {
        id: userData.uid,
        email: userData.email,
        fullName: userData.full_name,
        emailVerified: userData.email_verified,
        photoUrl: userData.photo_url,
      };

      // Fetch user profile to get daily_calorie_goal from Firestore
      try {
        const profileResponse = await apiClient.get('/api/user/profile');
        if (profileResponse.data?.daily_calorie_goal) {
          user.daily_calorie_goal = profileResponse.data.daily_calorie_goal;
          console.log('Login - Loaded daily calorie goal:', user.daily_calorie_goal);
        }
      } catch (profileError) {
        console.log('Could not fetch calorie goal (user may not have completed onboarding yet)');
      }

      setUser(user);
      await setObject(STORAGE_KEYS.USER_PROFILE, user);

      // Check onboarding status from backend (source of truth)
      let onboardingCompleted = false;
      try {
        const onboardingStatus = await userAPI.getOnboardingStatus();
        onboardingCompleted = onboardingStatus.onboarding_completed;
        console.log('Onboarding status from backend:', onboardingCompleted);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Fall back to local storage if backend call fails
        const localOnboardingComplete = await getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
        onboardingCompleted = localOnboardingComplete === 'true';
        console.log('Onboarding status from local storage:', onboardingCompleted);
      }

      // Update onboarding status in state and storage
      setHasCompletedOnboarding(onboardingCompleted);
      await setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, onboardingCompleted ? 'true' : 'false');

      // Check consent status from storage
      let consentAccepted = await getItem(STORAGE_KEYS.CONSENT_ACCEPTED);

      // If onboarding is completed, consent must also be accepted
      // (users can't complete onboarding without accepting consent first)
      if (onboardingCompleted && consentAccepted !== 'true') {
        console.log('Onboarding completed but consent not set - fixing...');
        await setItem(STORAGE_KEYS.CONSENT_ACCEPTED, 'true');
        consentAccepted = 'true';
      }

      setHasAcceptedConsent(consentAccepted === 'true');
      console.log('Consent accepted:', consentAccepted === 'true');

      // Set authenticated state last to trigger navigation
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  // Google OAuth login/signup function
  const googleLogin = async (idToken: string): Promise<void> => {
    try {
      // Call backend Google auth API
      const response = await authAPI.googleAuth(idToken);

      // Store tokens
      await setItem(STORAGE_KEYS.AUTH_TOKEN, response.access_token);
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);

      // Get user data
      const userData = await authAPI.getCurrentUser();

      const user: User = {
        id: userData.uid,
        email: userData.email,
        fullName: userData.full_name,
        emailVerified: userData.email_verified, // Always true for Google users
        photoUrl: userData.photo_url,
      };

      // Fetch user profile to get daily_calorie_goal from Firestore
      try {
        const profileResponse = await apiClient.get('/api/user/profile');
        if (profileResponse.data?.daily_calorie_goal) {
          user.daily_calorie_goal = profileResponse.data.daily_calorie_goal;
          console.log('Google login - Loaded daily calorie goal:', user.daily_calorie_goal);
        }
      } catch (profileError) {
        console.log('Could not fetch calorie goal (user may not have completed onboarding yet)');
      }

      setUser(user);
      await setObject(STORAGE_KEYS.USER_PROFILE, user);

      // Check onboarding status from backend (source of truth)
      let onboardingCompleted = false;
      try {
        const onboardingStatus = await userAPI.getOnboardingStatus();
        onboardingCompleted = onboardingStatus.onboarding_completed;
        console.log('Onboarding status from backend:', onboardingCompleted);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Fall back to local storage if backend call fails
        const localOnboardingComplete = await getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
        onboardingCompleted = localOnboardingComplete === 'true';
        console.log('Onboarding status from local storage:', onboardingCompleted);
      }

      // Update onboarding status in state and storage
      setHasCompletedOnboarding(onboardingCompleted);
      await setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, onboardingCompleted ? 'true' : 'false');

      // Check consent status from storage
      let consentAccepted = await getItem(STORAGE_KEYS.CONSENT_ACCEPTED);

      // If onboarding is completed, consent must also be accepted
      // (users can't complete onboarding without accepting consent first)
      if (onboardingCompleted && consentAccepted !== 'true') {
        console.log('Onboarding completed but consent not set - fixing...');
        await setItem(STORAGE_KEYS.CONSENT_ACCEPTED, 'true');
        consentAccepted = 'true';
      }

      setHasAcceptedConsent(consentAccepted === 'true');
      console.log('Consent accepted:', consentAccepted === 'true');

      // Set authenticated state last to trigger navigation
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.response?.data?.detail || 'Google authentication failed');
    }
  };

  // Signup function
  const signup = async (email: string, password: string, fullName?: string): Promise<void> => {
    try {
      // Call backend register API
      await authAPI.register(email, password, fullName || '');

      // Mark onboarding as incomplete for new users
      await setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'false');

      // Store temp credentials for post-verification login
      setTempEmail(email);
      setTempPassword(password);
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.response?.data?.detail || 'Signup failed');
    }
  };

  // Email verification
  const verifyEmail = async (code: string): Promise<boolean> => {
    // Note: Email verification is handled by clicking the link in email
    // This function is kept for compatibility but may not be used
    // The backend sends a verification link, not an OTP code

    // For now, we'll just validate the code format
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      // Auto-login after verification if temp credentials exist
      if (tempEmail && tempPassword) {
        try {
          await login(tempEmail, tempPassword);
          setTempEmail(null);
          setTempPassword(null);
          return true;
        } catch (error) {
          console.error('Auto-login after verification failed:', error);
          return false;
        }
      }
      return true;
    }
    return false;
  };

  // Password reset request
  const resetPassword = async (email: string): Promise<void> => {
    try {
      // Call backend forgot password API (sends OTP to email)
      await authAPI.forgotPassword(email);

      // Store temp email for password reset flow
      setTempEmail(email);
      await setItem(STORAGE_KEYS.TEMP_EMAIL, email);
    } catch (error: any) {
      console.error('Password reset request error:', error);
      throw new Error(error.response?.data?.detail || 'Password reset request failed');
    }
  };

  // Verify OTP for password reset
  const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
    try {
      await authAPI.verifyResetOTP(email, otp);
      return true;
    } catch (error: any) {
      console.error('OTP verification error:', error);
      throw new Error(error.response?.data?.detail || 'OTP verification failed');
    }
  };

  // Set new password
  const setNewPassword = async (password: string): Promise<void> => {
    try {
      if (!tempEmail) {
        throw new Error('Email not found. Please start the password reset process again.');
      }

      // Get the OTP from somewhere - this needs to be passed as parameter
      // For now, we'll throw an error as this flow needs adjustment
      throw new Error('This function needs to be updated to accept OTP parameter');

      // The actual call would be:
      // await authAPI.resetPasswordWithOTP(tempEmail, otp, password);

      // Clear temp data
      // setTempEmail(null);
      // await removeItem(STORAGE_KEYS.TEMP_EMAIL);
    } catch (error: any) {
      console.error('Set new password error:', error);
      throw new Error(error.response?.data?.detail || 'Password reset failed');
    }
  };

  // Reset password with OTP (new method that accepts OTP)
  const resetPasswordWithOTP = async (email: string, otp: string, newPassword: string): Promise<void> => {
    try {
      await authAPI.resetPasswordWithOTP(email, otp, newPassword);

      // Clear temp data
      setTempEmail(null);
      await removeItem(STORAGE_KEYS.TEMP_EMAIL);
    } catch (error: any) {
      console.error('Reset password with OTP error:', error);
      throw new Error(error.response?.data?.detail || 'Password reset failed');
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Call backend logout API (optional - invalidates token on server)
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API fails
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setHasCompletedOnboarding(false);
      setHasAcceptedConsent(false);
      useChatStore.getState().clearMessages();
      await removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await removeItem(STORAGE_KEYS.USER_PROFILE);
      await removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      await removeItem(STORAGE_KEYS.CONSENT_ACCEPTED);
      await removeItem(STORAGE_KEYS.ONBOARDING_DATA);
    }
  };

  // Refresh onboarding status (called after onboarding is completed)
  const refreshOnboardingStatus = async () => {
    const onboardingComplete = await getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    const consentAccepted = await getItem(STORAGE_KEYS.CONSENT_ACCEPTED);
    setHasCompletedOnboarding(onboardingComplete === 'true');
    setHasAcceptedConsent(consentAccepted === 'true');

    // After onboarding completes, fetch user profile to get calculated calorie goal
    if (onboardingComplete === 'true') {
      try {
        const profileResponse = await apiClient.get('/api/user/profile');
        if (profileResponse.data?.daily_calorie_goal && user) {
          const updatedUser: User = {
            ...user,
            daily_calorie_goal: profileResponse.data.daily_calorie_goal,
          };
          setUser(updatedUser);
          await setObject(STORAGE_KEYS.USER_PROFILE, updatedUser);
          console.log('Onboarding complete - Loaded daily calorie goal:', updatedUser.daily_calorie_goal);
        }
      } catch (profileError) {
        console.log('Could not fetch calorie goal after onboarding');
      }
    }
  };

  // Set consent as accepted (called from important-info screen)
  const setConsentAccepted = async (): Promise<void> => {
    await setItem(STORAGE_KEYS.CONSENT_ACCEPTED, 'true');
    setHasAcceptedConsent(true);
    console.log('Consent accepted and saved');
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    hasCompletedOnboarding,
    hasAcceptedConsent,
    login,
    googleLogin,
    signup,
    logout,
    verifyEmail,
    resetPassword,
    setNewPassword,
    refreshOnboardingStatus,
    setConsentAccepted,
    tempEmail,
    tempPassword,
    setTempEmail,
    setTempPassword,
    // New methods for OTP flow
    verifyOTP: verifyOTP as any,
    resetPasswordWithOTP: resetPasswordWithOTP as any,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
