import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/tokens';

// Screenshot/screen-recording prevention is per-screen now (see
// useScreenCaptureBlock), not app-wide — only screens that actually show
// photo content (home, album, camera, share) block it.
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

  // expo-updates' default behavior only applies a downloaded OTA update on
  // the NEXT cold start after the one that fetched it — so a fix could sit
  // downloaded-but-inactive until the user closes and reopens the app
  // twice. Check-and-apply immediately instead, so one relaunch is enough.
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    (async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch {
        // offline, or the check/fetch failed — next launch's background
        // check (expo-updates' own default behavior) will retry anyway
      }
    })();
  }, []);

  // Every push now pairs with a persisted Notification row (see
  // server/src/lib/notify.ts) — tapping any of them opens the in-app 알림함
  // list rather than trying to deep-link per push type here.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/notifications');
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
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          <Stack.Screen name="invite/[code]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="share" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
