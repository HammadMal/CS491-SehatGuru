import { useContext } from 'react';
import { OnboardingContext } from '../context/OnboardingContext';
import { OnboardingContextType } from '../types/onboarding.types';

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
