import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="splash" options={{ animation: 'none' }} />
      <Stack.Screen name="login" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="signup" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="email-verification" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="check-email" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="set-new-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="important-info" options={{ animation: 'fade' }} />
    </Stack>
  );
}
