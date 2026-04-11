// Email validation
export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.trim() === '') {
    return 'Email is required';
  }
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
};

// Helper function to calculate UTF-8 byte length (React Native compatible)
const getByteLength = (str: string): number => {
  try {
    // Works in React Native and modern browsers
    return new TextEncoder().encode(str).length;
  } catch {
    // Fallback for older environments: estimate based on character count
    // This is conservative - most ASCII characters are 1 byte
    return str.length;
  }
};

// Password validation
export const validatePassword = (password: string): string | null => {
  if (!password || password.trim() === '') {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (getByteLength(password) > 72) {
    return 'Password is too long (maximum 72 bytes)';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain an uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain a lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain a number';
  }
  return null;
};

// Password requirements check
export const getPasswordRequirements = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    maxLength: getByteLength(password) <= 72, // Bcrypt max is 72 bytes
  };
};

// Confirm password validation
export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword || confirmPassword.trim() === '') {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
};

// Name validation
export const validateName = (name: string): string | null => {
  if (!name || name.trim() === '') {
    return 'Name is required';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    return 'Name can only contain letters and spaces';
  }
  return null;
};

const parseFeetHeight = (height: string): number | null => {
  const trimmed = height.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  const feet = Number(parts[0]);
  if (Number.isNaN(feet) || feet < 0) return null;

  let inches = 0;
  if (parts.length > 1) {
    inches = Number(parts[1]);
    if (Number.isNaN(inches) || inches < 0 || inches >= 12) return null;
  }

  return feet * 12 + inches;
};

// Height validation
export const validateHeight = (height: string, unit: 'cm' | 'ft' = 'cm'): string | null => {
  if (!height || height.trim() === '') {
    return 'Height is required';
  }

  if (unit === 'cm') {
    const num = parseFloat(height);
    if (isNaN(num)) {
      return 'Height must be a number';
    }
    if (num < 50 || num > 250) {
      return 'Height must be between 50-250 cm';
    }
    return null;
  }

  const totalInches = parseFeetHeight(height);
  if (totalInches === null) {
    return 'Enter height as feet and inches (e.g. 5 7)';
  }
  if (totalInches < 36 || totalInches > 96) {
    return 'Height must be between 3\'0\" and 8\'0\"';
  }
  return null;
};

// Weight validation
export const validateWeight = (weight: string, unit: 'kg' | 'lbs' = 'kg'): string | null => {
  if (!weight || weight.trim() === '') {
    return 'Weight is required';
  }
  const num = parseFloat(weight);
  if (isNaN(num)) {
    return 'Weight must be a number';
  }
  if (unit === 'kg') {
    if (num < 30 || num > 250) {
      return 'Weight must be between 30-250 kg';
    }
  } else {
    if (num < 66 || num > 550) {
      return 'Weight must be between 66-550 lbs';
    }
  }
  return null;
};

// Age validation
export const validateAge = (age: string): string | null => {
  if (!age || age.trim() === '') {
    return 'Age is required';
  }
  const num = parseInt(age, 10);
  if (isNaN(num)) {
    return 'Age must be a number';
  }
  if (num < 13 || num > 100) {
    return 'Age must be between 13-100';
  }
  return null;
};

// Verification code validation
export const validateVerificationCode = (code: string[]): string | null => {
  const fullCode = code.join('');
  if (fullCode.length !== 6) {
    return 'Please enter all 6 digits';
  }
  if (!/^\d{6}$/.test(fullCode)) {
    return 'Code must be 6 digits';
  }
  return null;
};

// Gender validation
export const validateGender = (gender: string): string | null => {
  if (!gender || gender === '') {
    return 'Please select your gender';
  }
  return null;
};
