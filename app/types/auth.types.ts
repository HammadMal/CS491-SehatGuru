export interface User {
  id: string;
  email: string;
  fullName?: string;
  photoUrl?: string;
  emailVerified?: boolean;
}

export interface AuthContextType {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  hasCompletedOnboarding: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (code: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  setNewPassword: (password: string) => Promise<void>;
  refreshOnboardingStatus: () => Promise<void>;

  // Temporary state (before backend)
  tempEmail: string | null;
  tempPassword: string | null;
  setTempEmail: (email: string | null) => void;
  setTempPassword: (password: string | null) => void;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  confirmPassword?: string;
  fullName?: string;
}
