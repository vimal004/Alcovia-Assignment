import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⏱️</Text>,
        }}
      />
      <Tabs.Screen
        name="syllabus"
        options={{
          title: 'Syllabus',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📚</Text>,
        }}
      />
      <Tabs.Screen
        name="devpanel"
        options={{
          title: 'Dev Panel',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
