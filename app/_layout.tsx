import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  const bootstrap = useAppStore((s) => s.bootstrap);

  // Provisions (or re-authenticates) this device's backend account as soon
  // as the app launches, in parallel with the onboarding gate check.
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgVoid } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-friend" options={{ presentation: 'modal' }} />
          <Stack.Screen name="invite/[code]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="share" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
