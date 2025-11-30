import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types/auth.types';
import { getItem, setItem, removeItem, getObject, setObject, STORAGE_KEYS } from '../utils/storage';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
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

      if (token && userData) {
        setIsAuthenticated(true);
        setUser(userData);
        setHasCompletedOnboarding(onboardingComplete === 'true');
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock login function
  const login = async (email: string, password: string): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Retrieve stored user
    const storedUser = await getObject<{ email: string; password: string; fullName?: string; id: string }>(
      STORAGE_KEYS.MOCK_USER
    );

    if (storedUser && storedUser.email === email && storedUser.password === password) {
      // Successful login
      const user: User = {
        id: storedUser.id,
        email: storedUser.email,
        fullName: storedUser.fullName,
        emailVerified: true,
      };

      setUser(user);
      setIsAuthenticated(true);
      await setItem(STORAGE_KEYS.AUTH_TOKEN, `mock_token_${Date.now()}`);
      await setObject(STORAGE_KEYS.USER_PROFILE, user);

      // Check onboarding status
      const onboardingComplete = await getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      setHasCompletedOnboarding(onboardingComplete === 'true');
    } else {
      throw new Error('Invalid email or password');
    }
  };

  // Mock signup function
  const signup = async (email: string, password: string, fullName?: string): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create mock user
    const mockUser = {
      id: `user_${Date.now()}`,
      email,
      password,
      fullName: fullName || '',
    };

    // Store user data
    await setObject(STORAGE_KEYS.MOCK_USER, mockUser);

    // Explicitly mark onboarding as incomplete for new users
    await setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'false');

    // Store temp credentials for post-verification login
    setTempEmail(email);
    setTempPassword(password);
  };

  // Mock email verification
  const verifyEmail = async (code: string): Promise<boolean> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Accept any 6-digit code (mock)
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      // Auto-login after verification
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

  // Mock password reset request
  const resetPassword = async (email: string): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Store temp email for password reset
    setTempEmail(email);
    await setItem(STORAGE_KEYS.TEMP_EMAIL, email);
  };

  // Mock set new password
  const setNewPassword = async (password: string): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get stored user and update password
    const storedUser = await getObject<{ email: string; password: string; fullName?: string; id: string }>(
      STORAGE_KEYS.MOCK_USER
    );

    if (storedUser && tempEmail) {
      storedUser.password = password;
      await setObject(STORAGE_KEYS.MOCK_USER, storedUser);

      // Clear temp data
      setTempEmail(null);
      await removeItem(STORAGE_KEYS.TEMP_EMAIL);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setIsAuthenticated(false);
    setUser(null);
    setHasCompletedOnboarding(false);
    await removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await removeItem(STORAGE_KEYS.USER_PROFILE);
    await removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    await removeItem(STORAGE_KEYS.ONBOARDING_DATA);
  };

  // Refresh onboarding status (called after onboarding is completed)
  const refreshOnboardingStatus = async () => {
    const onboardingComplete = await getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    setHasCompletedOnboarding(onboardingComplete === 'true');
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    hasCompletedOnboarding,
    login,
    signup,
    logout,
    verifyEmail,
    resetPassword,
    setNewPassword,
    refreshOnboardingStatus,
    tempEmail,
    tempPassword,
    setTempEmail,
    setTempPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
