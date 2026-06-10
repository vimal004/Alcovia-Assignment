import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useFocusStore } from '@/stores/focusStore';
import { useSyncStore } from '@/stores/syncStore';
import { useDeviceStore } from '@/stores/deviceStore';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'GoogleSans-Regular': require('../assets/fonts/static/GoogleSans-Regular.ttf'),
    'GoogleSans-Medium': require('../assets/fonts/static/GoogleSans-Medium.ttf'),
    'GoogleSans-SemiBold': require('../assets/fonts/static/GoogleSans-SemiBold.ttf'),
    'GoogleSans-Bold': require('../assets/fonts/static/GoogleSans-Bold.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import { M3Colors } from '@/constants/Theme';

const M3LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: M3Colors.light.primary,
    background: M3Colors.light.background,
    card: M3Colors.light.surface,
    text: M3Colors.light.onSurface,
    border: M3Colors.light.outlineVariant,
  },
};

const M3DarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: M3Colors.dark.primary,
    background: M3Colors.dark.background,
    card: M3Colors.dark.surface,
    text: M3Colors.dark.onSurface,
    border: M3Colors.dark.outlineVariant,
  },
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const recoverStaleSessions = useFocusStore((state) => state.recoverStaleSessions);
  const pollPendingMutations = useSyncStore((state) => state.pollPendingMutations);
  const clientId = useDeviceStore((state) => state.clientId);

  // Extension 3: Crash Recovery — auto-fail any sessions stuck in 'running'
  // state from a previous crash, force-quit, or tab reload.
  useEffect(() => {
    recoverStaleSessions();
  }, []);

  // Extension 1: Two-Way Loop polling — every 2s check for server-initiated
  // mutations (e.g., WhatsApp reply or actions from another tab). If found, triggers
  // a delta sync to pull down the updated state automatically.
  useEffect(() => {
    const POLL_INTERVAL_MS = 2_000;
    const interval = setInterval(() => {
      pollPendingMutations(clientId);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [clientId]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? M3DarkTheme : M3LightTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
