import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '../src/store/useAppStore';
import { colors, fonts } from '../src/theme/tokens';

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

// 에스코어드림(S-Core Dream) as the app-wide default — every screen's plain
// <Text>/<TextInput> (no explicit fontFamily) picks this up automatically.
// A component's own style still wins for any key it sets, which is why the
// fontWeight → fontFamily sweep across app/src replaced every '600'/'700'/
// '800' with the matching SCDream weight file — a custom OTF only has the
// one weight it was cut at, so leaving `fontWeight` on top of it either
// does nothing or triggers synthetic (fake) bolding depending on platform.
const TextAny = Text as unknown as { defaultProps?: { style?: unknown } };
TextAny.defaultProps = TextAny.defaultProps || {};
TextAny.defaultProps.style = [{ fontFamily: fonts.regular }, TextAny.defaultProps.style];

const TextInputAny = TextInput as unknown as { defaultProps?: { style?: unknown } };
TextInputAny.defaultProps = TextInputAny.defaultProps || {};
TextInputAny.defaultProps.style = [{ fontFamily: fonts.regular }, TextInputAny.defaultProps.style];

export default function RootLayout() {
  // expo-font's native module is already compiled into the installed
  // binary (expo-vector-icons has depended on it from the start, and every
  // Ionicons glyph in this app already renders through it) — bundling new
  // OTF assets and loading them here is JS+asset only, safe to OTA.
  const [fontsLoaded] = useFonts({
    [fonts.regular]: require('../assets/fonts/SCDreamRegular.otf'),
    [fonts.medium]: require('../assets/fonts/SCDreamMedium.otf'),
    [fonts.bold]: require('../assets/fonts/SCDreamBold.otf'),
    [fonts.extraBold]: require('../assets/fonts/SCDreamExtraBold.otf'),
  });

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

  // Keep the blank frame (system font, briefly) rather than flashing
  // mismatched fonts across screens as they mount one by one.
  if (!fontsLoaded) return null;

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
          <Stack.Screen name="story/[groupId]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
