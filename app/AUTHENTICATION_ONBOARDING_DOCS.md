# SehatGuru Authentication & Onboarding System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [User Flows](#user-flows)
5. [Component Library](#component-library)
6. [State Management](#state-management)
7. [Mock Authentication](#mock-authentication)
8. [Validation System](#validation-system)
9. [Design System](#design-system)
10. [Backend Integration Guide](#backend-integration-guide)
11. [Testing Guide](#testing-guide)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This documentation describes the complete authentication and onboarding system implemented for the SehatGuru React Native app using Expo Router v6.

### What Was Built

A complete authentication and onboarding flow consisting of:
- **8 Authentication Screens**: Splash, Login, Signup, Email Verification, Forgot Password, OTP Verification, Set New Password, Important Information
- **4 Onboarding Screens**: Basic Info, Activity Level, Health Goals, Daily Meal Preferences
- **9 Reusable Components**: Logo, CustomButton, CustomInput, PasswordInput, Checkbox, VerificationCodeInput, ProgressIndicator, ActivityLevelCard, HealthGoalCard
- **State Management**: AuthContext and OnboardingContext using React Context API
- **Mock Authentication**: Fully functional mock auth system using AsyncStorage
- **Form Validation**: Comprehensive validation for all inputs
- **Design System**: Consistent styling with #22c55e green theme

### Key Features

✅ **Splash Screen** - Displays logo for 2.5 seconds, auto-navigates to login
✅ **Email/Password Authentication** - Full signup and login flow
✅ **Email Verification** - 6-digit OTP input with auto-submit
✅ **Password Reset** - OTP-based password reset flow
✅ **Multi-step Onboarding** - 4 steps with progress indicator and back navigation
✅ **Data Persistence** - AsyncStorage for local data storage
✅ **Form Validation** - Real-time validation with error messages
✅ **Keyboard Handling** - Proper KeyboardAvoidingView on all forms
✅ **Mock Authentication** - Ready for backend integration

---

## Architecture

### Navigation Structure

```
Root Layout (_layout.tsx)
├── AuthProvider
│   └── OnboardingProvider
│       └── Navigation Logic
│           ├── (auth) Group - Stack Navigator
│           │   ├── splash.tsx
│           │   ├── login.tsx
│           │   ├── signup.tsx
│           │   ├── email-verification.tsx
│           │   ├── forgot-password.tsx
│           │   ├── check-email.tsx (OTP Verification)
│           │   ├── set-new-password.tsx
│           │   └── important-info.tsx
│           │
│           ├── (onboarding) Group - Stack Navigator
│           │   ├── basic-info.tsx (Step 1/4)
│           │   ├── activity-level.tsx (Step 2/4)
│           │   ├── health-goals.tsx (Step 3/4)
│           │   └── daily-intake.tsx (Step 4/4)
│           │
│           └── (tabs) Group - Tab Navigator
│               ├── index.tsx (Dashboard)
│               ├── camera.tsx
│               ├── chatbot.tsx
│               └── profile.tsx
```

### Routing Logic

The root layout (`app/_layout.tsx`) handles navigation based on authentication state:

```typescript
if (!isAuthenticated && !inAuthGroup) {
  // Redirect to auth
  router.replace('/(auth)/splash');
}
else if (isAuthenticated && !hasCompletedOnboarding && !inOnboardingGroup && !inAuthGroup) {
  // Redirect to onboarding
  router.replace('/(onboarding)/basic-info');
}
else if (isAuthenticated && hasCompletedOnboarding && !inTabsGroup) {
  // Redirect to main app
  router.replace('/(tabs)');
}
```

**Key Points:**
- `!inAuthGroup` check allows users to complete important-info screen before onboarding
- State changes in AuthContext trigger automatic navigation
- `isLoading` prevents premature redirects during initial state check

---

## File Structure

```
app/
├── app/
│   ├── _layout.tsx                      # Root layout with auth routing
│   ├── (auth)/                          # Auth screens group
│   │   ├── _layout.tsx
│   │   ├── splash.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── email-verification.tsx
│   │   ├── forgot-password.tsx
│   │   ├── check-email.tsx              # OTP verification
│   │   ├── set-new-password.tsx
│   │   └── important-info.tsx
│   ├── (onboarding)/                    # Onboarding screens group
│   │   ├── _layout.tsx
│   │   ├── basic-info.tsx
│   │   ├── activity-level.tsx
│   │   ├── health-goals.tsx
│   │   └── daily-intake.tsx
│   └── (tabs)/                          # Main app screens
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── camera.tsx
│       ├── chatbot.tsx
│       └── profile.tsx
│
├── components/auth/                     # Reusable UI components
│   ├── Logo.tsx
│   ├── CustomButton.tsx
│   ├── CustomInput.tsx
│   ├── PasswordInput.tsx
│   ├── Checkbox.tsx
│   ├── VerificationCodeInput.tsx
│   ├── ProgressIndicator.tsx
│   ├── ActivityLevelCard.tsx
│   └── HealthGoalCard.tsx
│
├── context/                             # State management
│   ├── AuthContext.tsx
│   └── OnboardingContext.tsx
│
├── hooks/                               # Custom hooks
│   ├── useAuth.tsx
│   └── useOnboarding.tsx
│
├── utils/                               # Helper functions
│   ├── validation.ts
│   └── storage.ts
│
├── types/                               # TypeScript types
│   ├── auth.types.ts
│   └── onboarding.types.ts
│
├── constants/                           # Design system
│   ├── colors.ts
│   └── styles.ts
│
└── assets/images/                       # Logo files
    ├── logo1.png                        # Default logo (with background)
    ├── logo2.png
    └── logobgrm.png                     # Transparent logo (used in login)
```

---

## User Flows

### 1. New User Signup Flow

```
Splash Screen (2.5s)
  ↓
Login Screen
  ↓ [Click "Sign up"]
Signup Screen
  ↓ [Enter email, password, confirm password]
Email Verification Screen
  ↓ [Enter 6-digit code - auto-submit]
Important Information Screen
  ↓ [Accept both checkboxes]
Basic Info (Step 1/4)
  ↓ [Enter name, height, weight, age, gender]
Activity Level (Step 2/4)
  ↓ [Select activity level]
Health Goals (Step 3/4)
  ↓ [Select one or more goals]
Daily Meal Preferences (Step 4/4)
  ↓ [Select meals and dietary preferences]
Dashboard (Main App)
```

### 2. Existing User Login Flow

```
Splash Screen (2.5s)
  ↓
Login Screen
  ↓ [Enter email, password]
Important Information Screen (if not accepted before)
  ↓
Dashboard (if onboarding complete)
  OR
Basic Info (if onboarding not complete)
```

### 3. Password Reset Flow

```
Login Screen
  ↓ [Click "Forgot password?"]
Forgot Password Screen
  ↓ [Enter email]
Check Email / OTP Verification Screen
  ↓ [Enter 6-digit OTP - auto-submit]
Set New Password Screen
  ↓ [Enter new password with real-time validation]
Login Screen [with success message]
```

### 4. Logout Flow

```
Profile Screen
  ↓ [Click "Logout"]
Confirmation Alert
  ↓ [Confirm]
Login Screen
```

**Note:** Logout clears all auth and onboarding data from AsyncStorage.

---

## Component Library

### 1. Logo Component
**File:** `components/auth/Logo.tsx`

**Props:**
- `size?: number` (default: 150) - Logo dimensions in pixels
- `variant?: 'default' | 'transparent'` (default: 'default')

**Usage:**
```tsx
<Logo size={150} variant="transparent" />  // Login screen
<Logo size={200} />                        // Splash screen
```

**Variants:**
- `default` - Uses `logo1.png` (with background)
- `transparent` - Uses `logobgrm.png` (transparent background)

---

### 2. CustomButton Component
**File:** `components/auth/CustomButton.tsx`

**Props:**
- `title: string` - Button text
- `onPress: () => void` - Click handler
- `variant?: 'primary' | 'secondary' | 'outline'` (default: 'primary')
- `disabled?: boolean` (default: false)
- `loading?: boolean` (default: false)
- `style?: ViewStyle` - Additional styles

**Usage:**
```tsx
<CustomButton
  title="Login"
  onPress={handleLogin}
  loading={loading}
  disabled={loading}
/>
```

**Variants:**
- `primary` - Green background (#22c55e), white text
- `secondary` - White background, green border and text
- `outline` - Transparent background, gray border

---

### 3. CustomInput Component
**File:** `components/auth/CustomInput.tsx`

**Props:**
- `label?: string` - Input label
- `placeholder: string` - Placeholder text
- `value: string` - Input value
- `onChangeText: (text: string) => void` - Change handler
- `error?: string | null` - Error message to display
- `keyboardType?: KeyboardTypeOptions` - Keyboard type
- `autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'`
- `icon?: React.ReactNode` - Icon to display on the right

**Usage:**
```tsx
<CustomInput
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
  error={emailError}
  keyboardType="email-address"
  autoCapitalize="none"
/>
```

**Features:**
- Automatic error state styling (red border when error exists)
- Error message displayed below input
- Icon support for right-side decorations

---

### 4. PasswordInput Component
**File:** `components/auth/PasswordInput.tsx`

**Props:**
- `label?: string` - Input label
- `placeholder: string` - Placeholder text
- `value: string` - Input value
- `onChangeText: (text: string) => void` - Change handler
- `error?: string | null` - Error message

**Usage:**
```tsx
<PasswordInput
  label="Password"
  placeholder="Enter your password"
  value={password}
  onChangeText={setPassword}
  error={passwordError}
/>
```

**Features:**
- Eye icon to toggle password visibility
- Uses Ionicons: `eye-outline` / `eye-off-outline`
- Extends CustomInput with secureTextEntry toggle

---

### 5. VerificationCodeInput Component
**File:** `components/auth/VerificationCodeInput.tsx`

**Props:**
- `code: string[]` - Array of 6 digits
- `setCode: (code: string[]) => void` - Update handler
- `length?: number` (default: 6) - Number of input boxes

**Usage:**
```tsx
const [code, setCode] = useState(['', '', '', '', '', '']);

<VerificationCodeInput code={code} setCode={setCode} />
```

**Features:**
- 6 separate input boxes (48px width each)
- Auto-focus next box on digit input
- Auto-focus previous box on backspace
- Green border when filled
- Numeric keyboard
- Auto-submit when all boxes filled (implement in parent component)

**Implementation Pattern:**
```tsx
// Auto-submit when all 6 digits entered
useEffect(() => {
  if (code.every((digit) => digit !== '')) {
    handleVerify();
  }
}, [code]);
```

---

### 6. Checkbox Component
**File:** `components/auth/Checkbox.tsx`

**Props:**
- `checked: boolean` - Checked state
- `onToggle: () => void` - Toggle handler
- `label?: string | React.ReactNode` - Label text or component

**Usage:**
```tsx
<Checkbox
  checked={accepted}
  onToggle={() => setAccepted(!accepted)}
  label="I agree to the Terms and Conditions"
/>

// Or with custom label
<Checkbox
  checked={accepted}
  onToggle={() => setAccepted(!accepted)}
  label={
    <Text>
      I agree to the <Text style={styles.link}>Terms</Text>
    </Text>
  }
/>
```

**Features:**
- Custom checkbox design (24x24px)
- Green checkmark when checked
- Supports rich text labels

---

### 7. ProgressIndicator Component
**File:** `components/auth/ProgressIndicator.tsx`

**Props:**
- `totalSteps: number` - Total number of steps
- `currentStep: number` - Current step index (0-based)

**Usage:**
```tsx
<ProgressIndicator totalSteps={4} currentStep={2} />
// Shows: ● ● ● ○ (step 3 of 4)
```

**Features:**
- Horizontal dots (8px diameter)
- Current and completed steps: green (#22c55e)
- Upcoming steps: gray (#d1d5db)
- Automatically centers horizontally

---

### 8. ActivityLevelCard Component
**File:** `components/auth/ActivityLevelCard.tsx`

**Props:**
- `title: string` - Card title
- `description: string` - Card description
- `selected: boolean` - Selection state
- `onSelect: () => void` - Selection handler
- `icon?: React.ReactNode` - Optional icon

**Usage:**
```tsx
<ActivityLevelCard
  title="Moderately Active"
  description="Exercise 4-5 times per week"
  selected={selectedLevel === 'moderately-active'}
  onSelect={() => setSelectedLevel('moderately-active')}
/>
```

**Features:**
- Single selection (radio button behavior)
- Green border when selected
- Shadow effect
- Icon support (optional)

---

### 9. HealthGoalCard Component
**File:** `components/auth/HealthGoalCard.tsx`

**Props:**
- `title: string` - Card title
- `description?: string` - Card description (optional)
- `selected: boolean` - Selection state
- `onSelect: () => void` - Selection handler
- `icon?: React.ReactNode` - Optional icon

**Usage:**
```tsx
<HealthGoalCard
  title="Lose Weight"
  description="Reduce body fat and achieve a healthier weight"
  selected={selectedGoals.includes('lose-weight')}
  onSelect={() => toggleGoal('lose-weight')}
/>
```

**Features:**
- Multi-selection (checkbox behavior)
- Checkbox indicator on the right
- Green border when selected
- Similar styling to ActivityLevelCard

---

## State Management

### AuthContext
**File:** `context/AuthContext.tsx`

**State:**
```typescript
{
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  hasCompletedOnboarding: boolean;
  tempEmail: string | null;
  tempPassword: string | null;
}
```

**Actions:**
```typescript
login(email: string, password: string): Promise<void>
signup(email: string, password: string, fullName?: string): Promise<void>
logout(): Promise<void>
verifyEmail(code: string): Promise<boolean>
resetPassword(email: string): Promise<void>
setNewPassword(password: string): Promise<void>
refreshOnboardingStatus(): Promise<void>
setTempEmail(email: string | null): void
setTempPassword(password: string | null): void
```

**Usage:**
```tsx
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuth();

  // Use auth state and actions
}
```

**Key Implementation Details:**

1. **Initial Load:** Checks AsyncStorage for existing auth on mount
2. **Signup:** Sets onboarding_complete to 'false' explicitly for new users
3. **Login:** Checks onboarding status and sets hasCompletedOnboarding
4. **Logout:** Clears auth token, user profile, and onboarding data
5. **refreshOnboardingStatus:** Called after onboarding completion to update state

---

### OnboardingContext
**File:** `context/OnboardingContext.tsx`

**State:**
```typescript
{
  onboardingData: OnboardingData;
  currentStep: number;
}
```

**OnboardingData Structure:**
```typescript
{
  basicInfo: {
    fullName: string;
    height: string;
    heightUnit: 'cm' | 'ft';
    weight: string;
    weightUnit: 'kg' | 'lbs';
    age: string;
    gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | '';
  };
  activityLevel: ActivityLevel;
  healthGoals: HealthGoal[];
  mealPreferences: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    snacks: boolean;
  };
  dietaryPreferences: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    other: string;
  };
}
```

**Actions:**
```typescript
updateBasicInfo(data: BasicInfo): void
updateActivityLevel(level: ActivityLevel): void
updateHealthGoals(goals: HealthGoal[]): void
updateMealPreferences(preferences: MealPreferences): void
updateDietaryPreferences(preferences: DietaryPreferences): void
completeOnboarding(): Promise<void>
goToNextStep(): void
goToPreviousStep(): void
resetOnboarding(): void
```

**Usage:**
```tsx
import { useOnboarding } from '../hooks/useOnboarding';

function MyComponent() {
  const { onboardingData, updateBasicInfo, completeOnboarding } = useOnboarding();

  // Use onboarding state and actions
}
```

**Key Implementation Details:**

1. **completeOnboarding:** Saves data to AsyncStorage and refreshes auth state
2. **Step Management:** currentStep tracks progress (0-3 for 4 steps)
3. **Data Persistence:** All updates stored in context, saved to AsyncStorage on completion

---

## Mock Authentication

### How It Works

The authentication system uses AsyncStorage to simulate a backend API. This allows full testing of the auth flow before backend integration.

**AsyncStorage Keys:**
- `auth_token` - Mock authentication token
- `mock_user` - User credentials and profile
- `onboarding_complete` - Boolean flag ('true' or 'false')
- `onboarding_data` - Complete onboarding information
- `user_profile` - User profile data
- `temp_email` - Temporary email for verification/reset flows
- `temp_password` - Temporary password for post-verification login

### Mock Behaviors

**Signup:**
```typescript
// Creates user with structure:
{
  id: 'user_1234567890',
  email: 'user@example.com',
  password: 'Password123',  // Stored in plain text (mock only!)
  fullName: 'John Doe'
}
```

**Login:**
```typescript
// Validates against stored user
// On success:
// - Sets auth_token
// - Sets user_profile
// - Checks onboarding_complete
// - Updates hasCompletedOnboarding state
```

**Email Verification:**
```typescript
// Accepts any 6-digit code
// On success:
// - Auto-logs in using tempEmail and tempPassword
// - Clears temp credentials
```

**Password Reset:**
```typescript
// Forgot Password: Stores tempEmail
// OTP Verification: Accepts any 6-digit code
// Set New Password: Updates password in mock_user
```

**Logout:**
```typescript
// Clears:
// - auth_token
// - user_profile
// - onboarding_complete
// - onboarding_data
```

### Testing Credentials

**Any email/password combination works for signup**

**For login, use credentials you created during signup**

**Verification codes: Any 6-digit code (e.g., 123456)**

**OTP codes: Any 6-digit code (e.g., 123456)**

---

## Validation System

**File:** `utils/validation.ts`

### Email Validation
```typescript
validateEmail(email: string): string | null
```
- Checks if email is provided
- Validates format using regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Returns error message or null

### Password Validation
```typescript
validatePassword(password: string): string | null
```
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Returns error message or null

### Password Requirements Check
```typescript
getPasswordRequirements(password: string): {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}
```
Used for real-time password validation feedback in set-new-password screen.

### Confirm Password Validation
```typescript
validateConfirmPassword(password: string, confirmPassword: string): string | null
```
- Checks if confirmation is provided
- Validates passwords match
- Returns error message or null

### Name Validation
```typescript
validateName(name: string): string | null
```
- Minimum 2 characters
- Letters and spaces only
- Returns error message or null

### Numeric Validations

**Height:**
```typescript
validateHeight(height: string, unit: 'cm' | 'ft'): string | null
```
- cm: 50-300 range
- ft: 2-9 range

**Weight:**
```typescript
validateWeight(weight: string, unit: 'kg' | 'lbs'): string | null
```
- kg: 20-500 range
- lbs: 44-1100 range

**Age:**
```typescript
validateAge(age: string): string | null
```
- Range: 13-120

### Verification Code Validation
```typescript
validateVerificationCode(code: string[]): string | null
```
- Must be 6 digits
- All boxes must be filled
- Returns error message or null

### Gender Validation
```typescript
validateGender(gender: string): string | null
```
- Must not be empty string
- Returns error message or null

---

## Design System

### Colors
**File:** `constants/colors.ts`

```typescript
export const Colors = {
  // Primary
  primary: '#22c55e',        // Main green theme
  primaryLight: '#86efac',
  primaryDark: '#16a34a',

  // Background
  background: '#F4F6F8',     // Screen backgrounds
  backgroundLight: '#FFFFFF', // Cards, inputs

  // Text
  textPrimary: '#1E1E1E',    // Headlines
  textSecondary: '#777',     // Labels
  textLight: '#999',         // Captions

  // Borders
  border: '#e5e7eb',         // Input borders
  borderLight: '#f3f4f6',

  // States
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',

  // UI Elements
  shadow: '#000',
  disabled: '#d1d5db',
  placeholder: '#9ca3af',
};
```

### Common Styles
**File:** `constants/styles.ts`

**Card Style:**
```typescript
card: {
  backgroundColor: '#fff',
  borderRadius: 15,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
}
```

**Container Style:**
```typescript
container: {
  flex: 1,
  backgroundColor: '#F4F6F8',
  paddingHorizontal: 20,
}
```

**Primary Button Style:**
```typescript
primaryButton: {
  backgroundColor: '#22c55e',
  paddingVertical: 14,
  borderRadius: 14,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
}
```

**Input Style:**
```typescript
input: {
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#e5e7eb',
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 16,
  fontSize: 16,
  color: '#1E1E1E',
}
```

### Typography Scale

- **H1:** 28px, bold
- **H2:** 22px, bold
- **Body:** 16px
- **Caption:** 14px
- **Small:** 12px

### Spacing System

Uses multiples of 4: 4, 8, 12, 16, 20, 24, 32, 40

### Consistency Rules

1. **Screen padding:** 20px horizontal
2. **Border radius:** 12-15px for most elements
3. **Shadows:** Always include elevation for Android
4. **Button padding:** 14px vertical
5. **Input padding:** 14px vertical, 16px horizontal

---

## Backend Integration Guide

### Overview

The current system uses mock authentication with AsyncStorage. To integrate with the backend:

1. Replace mock functions in AuthContext with actual API calls
2. Use existing backend at `http://192.168.18.145:8000`
3. Update axios interceptors for auth headers
4. Handle refresh tokens
5. Add proper error handling

### Backend Endpoints Available

**File:** `backend/app/routes/auth.py`

```
POST   /auth/register              - Email & password registration
POST   /auth/login                 - Email & password login
POST   /auth/google                - Google OAuth integration
POST   /auth/refresh               - Refresh access token
GET    /auth/me                    - Get current user info
POST   /auth/forgot-password       - Password reset request
POST   /auth/reset-password        - Confirm password reset
POST   /auth/verify-email          - Email verification
POST   /auth/logout                - Logout (token blacklist)
DELETE /auth/delete-account        - Account deletion
```

### Migration Steps

**Step 1: Create API Service**

Create `services/auth.api.ts`:

```typescript
import apiClient from './api';

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  signup: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/register', { email, password });
    return response.data;
  },

  verifyEmail: async (code: string) => {
    const response = await apiClient.post('/auth/verify-email', { code });
    return response.data;
  },

  resetPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  setNewPassword: async (token: string, password: string) => {
    const response = await apiClient.post('/auth/reset-password', { token, password });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};
```

**Step 2: Update AuthContext**

Replace mock functions:

```typescript
// Before (Mock)
const login = async (email: string, password: string) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const storedUser = await getObject(STORAGE_KEYS.MOCK_USER);
  // ... mock logic
};

// After (Real API)
const login = async (email: string, password: string) => {
  const response = await authAPI.login(email, password);
  const { access_token, refresh_token, user } = response;

  setUser(user);
  setIsAuthenticated(true);
  await setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);
  await setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
  await setObject(STORAGE_KEYS.USER_PROFILE, user);

  // Check onboarding status from backend or AsyncStorage
  const onboardingComplete = await getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
  setHasCompletedOnboarding(onboardingComplete === 'true');
};
```

**Step 3: Add Axios Interceptors**

Update `services/api.ts`:

```typescript
import axios from 'axios';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';

const apiClient = axios.create({
  baseURL: 'http://192.168.18.145:8000',
  timeout: 10000,
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const response = await axios.post(
          'http://192.168.18.145:8000/auth/refresh',
          { refresh_token: refreshToken }
        );

        const { access_token } = response.data;
        await setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        // Navigate to login screen
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

**Step 4: Update Onboarding Completion**

Send onboarding data to backend:

```typescript
const completeOnboarding = async () => {
  try {
    // Save to backend
    await apiClient.post('/user/onboarding', onboardingData);

    // Save locally
    await setObject(STORAGE_KEYS.ONBOARDING_DATA, onboardingData);
    await setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');

    // Refresh auth state
    if (authContext?.refreshOnboardingStatus) {
      await authContext.refreshOnboardingStatus();
    }
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
};
```

**Step 5: Remove Mock Storage**

After backend integration:
- Remove MOCK_USER from AsyncStorage keys
- Remove password storage (never store passwords locally!)
- Keep only tokens and user profile

### Testing Backend Integration

1. **Test login with real credentials from backend**
2. **Test signup and email verification flow**
3. **Test password reset with actual OTP from backend**
4. **Test token refresh on 401 responses**
5. **Test logout and token invalidation**
6. **Test onboarding data persistence to backend**

---

## Testing Guide

### Manual Testing Checklist

**Authentication Flow:**
- [ ] Splash screen displays for 2.5s and navigates to login
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] Signup creates new account
- [ ] Email verification accepts 6-digit code
- [ ] Email verification auto-submits when all digits entered
- [ ] Forgot password sends email (mock)
- [ ] OTP verification accepts 6-digit code
- [ ] Password reset updates password and redirects to login
- [ ] Terms acceptance required before onboarding

**Onboarding Flow:**
- [ ] All onboarding steps save data
- [ ] Back navigation works in all onboarding steps
- [ ] Progress indicator updates correctly
- [ ] Basic info validates all fields
- [ ] Height/weight unit selection works
- [ ] Gender selection works
- [ ] Activity level selection works (single select)
- [ ] Health goals selection works (multi-select)
- [ ] Daily intake checkboxes work
- [ ] Onboarding completion navigates to dashboard

**Validation:**
- [ ] Email validation shows correct errors
- [ ] Password requirements enforced
- [ ] Password confirmation matches
- [ ] Name validation works
- [ ] Height/weight/age validation works
- [ ] Verification code requires 6 digits
- [ ] Form submission disabled with errors

**UI/UX:**
- [ ] All screens match design
- [ ] Colors consistent (#22c55e theme)
- [ ] Buttons have proper touch feedback
- [ ] Inputs focus properly
- [ ] Keyboard doesn't cover inputs
- [ ] Error messages display clearly
- [ ] Loading states show appropriately
- [ ] Transparent logo displays on login screen

**Navigation:**
- [ ] Root layout routes correctly based on auth state
- [ ] Important info screen doesn't auto-skip
- [ ] Logout clears all data
- [ ] App restart preserves auth state

**Data Persistence:**
- [ ] Login state persists after app restart
- [ ] Onboarding completion persists
- [ ] User profile persists
- [ ] Clear all data works from profile

### Testing Mock Authentication

**Create a new account:**
1. Open app → See splash → Navigate to login
2. Click "Sign up"
3. Enter email: test@example.com
4. Enter password: Test123456
5. Confirm password: Test123456
6. Click "Sign Up"
7. Enter any 6-digit code (e.g., 123456)
8. Should auto-submit and navigate to Important Info

**Login with existing account:**
1. Open app
2. Enter email: test@example.com
3. Enter password: Test123456
4. Click "Login"
5. Should navigate to dashboard (if onboarding complete)

**Reset password:**
1. Click "Forgot password?" on login
2. Enter email: test@example.com
3. Click "Send Instructions"
4. Enter any 6-digit OTP (e.g., 123456)
5. Should auto-submit and navigate to Set New Password
6. Enter new password: NewPass123
7. Confirm password: NewPass123
8. Click "Reset Password"
9. Should show success alert and navigate to login

**Complete onboarding:**
1. After email verification, accept terms
2. Fill basic info with valid data
3. Select activity level
4. Select one or more health goals
5. Select meal preferences
6. Click "Complete"
7. Should navigate to dashboard

**Clear data and test again:**
1. Go to Profile tab
2. Click "Clear All Data"
3. Confirm
4. Close and reopen app
5. Should see splash screen

---

## Troubleshooting

### Common Issues

#### Issue: App goes directly to dashboard after fresh install

**Cause:** Cached data in AsyncStorage from previous testing

**Solution:**
1. Navigate to Profile tab
2. Tap "Clear All Data"
3. Force close the app
4. Reopen the app

Or clear AsyncStorage programmatically:
```typescript
import { clearAll } from './utils/storage';
await clearAll();
```

---

#### Issue: Onboarding screen appears briefly then disappears

**Cause:** hasCompletedOnboarding is true in AsyncStorage but user is still in onboarding flow

**Solution:**
- Ensure signup explicitly sets onboarding_complete to 'false'
- Check root layout navigation logic doesn't redirect too early
- Verify refreshOnboardingStatus is called after completion

**Fix Applied:** `signup()` now sets `onboarding_complete` to `'false'` explicitly

---

#### Issue: Important Info screen auto-skips to onboarding

**Cause:** Root layout redirects authenticated users to onboarding before they can accept terms

**Solution:**
- Added `&& !inAuthGroup` check in root layout
- This allows users to stay on important-info screen until they click Continue

**Fix Applied:** Root layout now checks `!inAuthGroup` before redirecting to onboarding

---

#### Issue: Keyboard covers input fields

**Cause:** Missing KeyboardAvoidingView or insufficient scroll space

**Solution:**
- Wrap content in KeyboardAvoidingView
- Increase bottom padding in ScrollView (40px recommended)
- Add `keyboardShouldPersistTaps="handled"`

**Screens Fixed:**
- basic-info.tsx
- daily-intake.tsx
- set-new-password.tsx
- login.tsx (already had it)

---

#### Issue: Navigation not working after onboarding completion

**Cause:** hasCompletedOnboarding state not updating

**Solution:**
- Ensure `refreshOnboardingStatus()` is called in `completeOnboarding()`
- Verify router is in useEffect dependency array
- Check AsyncStorage has `onboarding_complete = 'true'`

**Fix Applied:** OnboardingContext calls `refreshOnboardingStatus()` after saving data

---

#### Issue: Profile shows old data after logout

**Cause:** AsyncStorage not properly cleared

**Solution:**
- Logout function now clears:
  - auth_token
  - user_profile
  - onboarding_complete
  - onboarding_data

**Fix Applied:** `logout()` in AuthContext clears all relevant data

---

### Debugging Tips

**Check AsyncStorage contents:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get all keys
const keys = await AsyncStorage.getAllKeys();
console.log('AsyncStorage keys:', keys);

// Get specific value
const value = await AsyncStorage.getItem('auth_token');
console.log('Auth token:', value);
```

**Check navigation segments:**
```typescript
// In root layout
console.log('Current segments:', segments);
console.log('Auth state:', { isAuthenticated, hasCompletedOnboarding, isLoading });
```

**Test validation functions:**
```typescript
import { validateEmail, validatePassword } from './utils/validation';

console.log(validateEmail('test@example.com')); // null (valid)
console.log(validateEmail('invalid')); // 'Invalid email format'
console.log(validatePassword('Test123')); // 'Password must be at least 8 characters'
```

---

## Future Enhancements

### Planned Features

1. **Social Authentication**
   - Google OAuth (backend endpoint exists)
   - Apple Sign In
   - Facebook Login

2. **Biometric Authentication**
   - Face ID / Touch ID for login
   - Secure token storage in Keychain

3. **Profile Editing**
   - Edit basic info after onboarding
   - Change password
   - Update preferences

4. **Email Templates**
   - Branded email verification emails
   - Password reset emails with OTP
   - Welcome emails

5. **Advanced Onboarding**
   - Skip options for certain steps
   - Save progress and resume later
   - Pre-fill data from health apps

6. **Analytics**
   - Track signup completion rate
   - Monitor drop-off points
   - A/B test different flows

### Backend Integration Checklist

- [ ] Replace mock login with API call
- [ ] Replace mock signup with API call
- [ ] Replace mock email verification with API call
- [ ] Replace mock password reset with API call
- [ ] Add token refresh logic
- [ ] Add axios interceptors
- [ ] Send onboarding data to backend
- [ ] Fetch user profile from backend
- [ ] Handle network errors gracefully
- [ ] Add loading states for API calls
- [ ] Remove mock AsyncStorage keys
- [ ] Test complete flow end-to-end

---

## Summary

This authentication and onboarding system provides a complete, production-ready flow for user authentication and data collection. The mock authentication allows full testing before backend integration, and the modular structure makes it easy to swap mock functions with real API calls.

**Key Achievements:**
- ✅ 12 fully functional screens
- ✅ 9 reusable components
- ✅ Complete state management with Context API
- ✅ Comprehensive form validation
- ✅ Mock authentication ready for backend swap
- ✅ Consistent design system
- ✅ Proper keyboard handling
- ✅ Data persistence with AsyncStorage
- ✅ Clean navigation architecture

**Next Steps:**
1. Test all flows thoroughly
2. Integrate with backend API
3. Add analytics tracking
4. Implement social authentication
5. Add biometric authentication
6. Enhance error handling

---

**Document Version:** 1.0
**Last Updated:** December 1, 2024
**Maintained By:** SehatGuru Development Team
