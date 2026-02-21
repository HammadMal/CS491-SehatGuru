import { Stack, useSegments, useRouter } from 'expo-router';
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

    const segment = segments[0];
    const screen = segments[1];

    const isManual = segment === 'manual';
    const isAuth = segment === '(auth)';
    const isOnboarding = segment === '(onboarding)';
    const isTabs = segment === '(tabs)';
    const isImportantInfo = screen === 'important-info';

    // ===== 1. User NOT logged in =====
    if (!isAuthenticated) {
      if (!isAuth) router.replace('/(auth)/splash');
      return;
    }

    // ===== 2. User logged in but has NOT accepted consent =====
    if (!hasAcceptedConsent) {
      if (!isImportantInfo) router.replace('/(auth)/important-info');
      return;
    }

    // ===== 3. User accepted consent but NOT finished onboarding =====
    if (!hasCompletedOnboarding) {
      if (!isOnboarding) router.replace('/(onboarding)/basic-info');
      return;
    }

    // ===== 4. User finished onboarding =====
    const allowedScreens = ['(tabs)', 'manual', 'analytics', 'edit-profile'];
    if (!allowedScreens.includes(segment)) {
      router.replace('/(tabs)');
    }
  }, [
    isAuthenticated,
    isLoading,
    hasCompletedOnboarding,
    hasAcceptedConsent,
    segments,
    router
  ]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="manual" />
      <Stack.Screen name="analytics" />
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