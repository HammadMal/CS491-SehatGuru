import { Stack, Redirect, useSegments, useRouter } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { OnboardingProvider } from '../context/OnboardingContext';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to auth if not authenticated
      router.replace('/(auth)/splash');
    } else if (isAuthenticated && !hasCompletedOnboarding && !inOnboardingGroup && !inAuthGroup) {
      // Redirect to onboarding if authenticated but not completed onboarding
      // BUT only if not still in auth group (e.g., important-info screen)
      router.replace('/(onboarding)/basic-info');
    } else if (isAuthenticated && hasCompletedOnboarding && !inTabsGroup) {
      // Redirect to main app if authenticated and completed onboarding
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, hasCompletedOnboarding, isLoading, segments, router]);

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
