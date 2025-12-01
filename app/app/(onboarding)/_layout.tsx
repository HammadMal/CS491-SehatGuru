import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="basic-info" />
      <Stack.Screen name="activity-level" />
      <Stack.Screen name="health-goals" />
      <Stack.Screen name="daily-intake" />
    </Stack>
  );
}
