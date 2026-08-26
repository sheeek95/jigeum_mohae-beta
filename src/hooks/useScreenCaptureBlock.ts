import { useFocusEffect } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useCallback } from 'react';
import { Platform } from 'react-native';

// Blocks screenshots/screen recording only while the calling screen is
// focused, so other screens (onboarding, settings, etc.) stay screenshottable.
// expo-screen-capture ships no web implementation at all — every export,
// including isAvailableAsync(), throws there instead of resolving false —
// so Platform.OS is the only safe guard.
export function useScreenCaptureBlock() {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      ScreenCapture.preventScreenCaptureAsync();
      return () => {
        ScreenCapture.allowScreenCaptureAsync();
      };
    }, [])
  );
}
