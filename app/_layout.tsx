import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/tokens';

// Photos here are private and meant to disappear — block screenshots and
// screen recording app-wide (Android: always; iOS 13+: screenshots, iOS
// 11+: recording). No effect on web.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const bootstrap = useAppStore((s) => s.bootstrap);

  // Provisions (or re-authenticates) this device's backend account as soon
  // as the app launches, in parallel with the onboarding gate check.
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // expo-screen-capture ships no web implementation at all — every export,
  // including isAvailableAsync(), throws there instead of resolving false —
  // so Platform.OS is the only safe guard.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenCapture.preventScreenCaptureAsync();
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  // A tapped "저장 요청" push (see server/src/routes/photos.ts) carries the
  // photo's requester so we can jump straight to the album's sent tab.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'save-request') router.push('/(tabs)/album');
    });
    return () => sub.remove();
  }, []);

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
