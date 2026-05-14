import { Stack, useSegments, useRouter } from 'expo-router';
import { LogBox } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { OnboardingProvider } from '../context/OnboardingContext';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { InAppNotificationHost } from '../components/InAppNotificationHost';
import { notificationService } from '../services/notification.service';
import { hydrateGamificationState, resetGamificationState } from '../services/gamification.sync';
import { useNotificationStore } from '../store/useNotificationStore';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

SplashScreen.preventAutoHideAsync();

Asset.fromModule(require('../assets/images/foodhero.png')).downloadAsync();


function RootLayoutNav() {
  const { isAuthenticated, isLoading, hasCompletedOnboarding, hasAcceptedConsent, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const loadNotificationPrefs = useNotificationStore((s) => s.loadPreferences);

  useEffect(() => {
    notificationService.initialize();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotificationPrefs();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      resetGamificationState();
      return;
    }

    hydrateGamificationState(user.id).catch(console.error);
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isLoading) return;

    const segment = segments[0];
    const screen  = segments[1];

    const isManual        = segment === 'manual';
    const isAuth          = segment === '(auth)';
    const isOnboarding    = segment === '(onboarding)';
    const isTabs          = segment === '(tabs)';
    const isImportantInfo = screen === 'important-info';

    if (!isAuthenticated) {
      if (!isAuth) router.replace('/(auth)/splash');
      return;
    }
    if (!hasAcceptedConsent) {
      if (!isImportantInfo) router.replace('/(auth)/important-info');
      return;
    }
    if (!hasCompletedOnboarding) {
      if (!isOnboarding) router.replace('/(onboarding)/basic-info');
      return;
    }

    const allowed = ['(tabs)', 'manual', 'analytics', 'edit-profile', 'custom-dish', 'notification-settings'];
    if (!allowed.includes(segment)) router.replace('/(tabs)');
  }, [isAuthenticated, isLoading, hasCompletedOnboarding, hasAcceptedConsent, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(onboarding)" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="manual" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="analytics" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="custom-dish" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="notification-settings" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <OnboardingProvider>
        <>
          <RootLayoutNav />
          <InAppNotificationHost />
        </>
      </OnboardingProvider>
    </AuthProvider>
  );
}
