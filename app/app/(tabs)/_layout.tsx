import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';

export default function Layout() {
  const pathname = usePathname();

  // Hide tab bar ONLY on the manual screen
  const hideTabBar = pathname === '/manual';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: hideTabBar ? { display: 'none' } : {},
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="camera"
        options={{
          title: 'Add Meal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'SehatGuru',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
