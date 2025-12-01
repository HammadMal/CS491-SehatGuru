import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'access_token',           // JWT access token
  REFRESH_TOKEN: 'refresh_token',       // JWT refresh token
  USER_PROFILE: 'user_profile',         // User profile data
  ONBOARDING_DATA: 'onboarding_data',   // Onboarding data (local backup)
  ONBOARDING_COMPLETE: 'onboarding_complete', // Onboarding completion flag
  CONSENT_ACCEPTED: 'consent_accepted', // Privacy policy and terms acceptance
  TEMP_EMAIL: 'temp_email',             // Temporary email for password reset flow
};

// Get item from storage
export const getItem = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`Error getting item ${key}:`, error);
    return null;
  }
};

// Set item in storage
export const setItem = async (key: string, value: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error setting item ${key}:`, error);
    return false;
  }
};

// Remove item from storage
export const removeItem = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item ${key}:`, error);
    return false;
  }
};

// Clear all storage
export const clearAll = async (): Promise<boolean> => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    return false;
  }
};

// Get JSON object from storage
export const getObject = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting object ${key}:`, error);
    return null;
  }
};

// Set JSON object in storage
export const setObject = async <T>(key: string, value: T): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting object ${key}:`, error);
    return false;
  }
};
