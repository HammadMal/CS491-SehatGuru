import { Stack, Redirect, useSegments, useRouter } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { OnboardingProvider } from '../context/OnboardingContext';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, hasCompletedOnboarding, hasAcceptedConsent } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';
    const onImportantInfo = segments[1] === 'important-info';

    console.log('Navigation check:', {
      isAuthenticated,
      hasAcceptedConsent,
      hasCompletedOnboarding,
      currentSegment: segments[0],
      currentScreen: segments[1],
      inAuthGroup,
      inOnboardingGroup,
      inTabsGroup,
      onImportantInfo
    });

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to auth if not authenticated
      console.log('Redirecting to auth/splash');
      router.replace('/(auth)/splash');
    } else if (isAuthenticated && hasCompletedOnboarding && !inTabsGroup) {
      // If onboarding is complete, go straight to tabs (skip consent check)
      console.log('Redirecting to tabs (onboarding complete)');
      router.replace('/(tabs)');
    } else if (isAuthenticated && !hasCompletedOnboarding && !hasAcceptedConsent && !onImportantInfo) {
      // Only show consent screen for new users who haven't completed onboarding
      console.log('Redirecting to important-info (new user, no consent)');
      router.replace('/(auth)/important-info');
    } else if (isAuthenticated && !hasCompletedOnboarding && hasAcceptedConsent && !inOnboardingGroup) {
      // Redirect to onboarding if consent accepted but onboarding not completed
      console.log('Redirecting to onboarding/basic-info');
      router.replace('/(onboarding)/basic-info');
    }
  }, [isAuthenticated, hasAcceptedConsent, hasCompletedOnboarding, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <RootLayoutNav />
      </OnboardingProvider>
    </AuthProvider>
  );
}
