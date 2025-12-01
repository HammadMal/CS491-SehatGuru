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

// Password validation
export const validatePassword = (password: string): string | null => {
  if (!password || password.trim() === '') {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
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

// Height validation
export const validateHeight = (height: string, unit: 'cm' | 'ft' = 'cm'): string | null => {
  if (!height || height.trim() === '') {
    return 'Height is required';
  }
  const num = parseFloat(height);
  if (isNaN(num)) {
    return 'Height must be a number';
  }
  if (unit === 'cm') {
    if (num < 50 || num > 300) {
      return 'Height must be between 50-300 cm';
    }
  } else {
    if (num < 2 || num > 9) {
      return 'Height must be between 2-9 ft';
    }
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
    if (num < 20 || num > 500) {
      return 'Weight must be between 20-500 kg';
    }
  } else {
    if (num < 44 || num > 1100) {
      return 'Weight must be between 44-1100 lbs';
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
  if (num < 13 || num > 120) {
    return 'Age must be between 13-120';
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
