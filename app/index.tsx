import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/tokens';

export default function Index() {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const authStatus = useAppStore((s) => s.authStatus);
  const authError = useAppStore((s) => s.authError);
  const bootstrap = useAppStore((s) => s.bootstrap);

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAppStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Also wait out bootstrap() (kicked off by the root layout) — login is
  // mandatory now, so the gate needs to know whether there's actually a
  // usable session before deciding where to send a returning user.
  if (!hydrated || authStatus === 'idle' || authStatus === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgVoid, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  // bootstrap() failed on something other than a bad token (network,
  // server error, timeout) — falling through to the tabs redirect below
  // would have silently dropped the user into a UI with no real session,
  // where every screen gating on authStatus === 'ready' just spins
  // forever with no way out. Show a retry instead.
  if (authStatus === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgVoid, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 }}>
        <Text style={{ color: colors.textMid, fontSize: 13, textAlign: 'center' }}>
          {authError ?? '연결에 실패했어요'}
        </Text>
        <Pressable
          onPress={() => bootstrap()}
          style={{ backgroundColor: colors.surfaceHi, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 }}
        >
          <Text style={{ color: colors.textHi, fontSize: 13, fontFamily: 'SCDream-Bold' }}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  // No usable session (brand new install, or one that needs to link an
  // existing pre-Kakao account) — onboarding's final step handles login,
  // regardless of whether this device has been through onboarding before.
  if (authStatus === 'needs-login' || authStatus === 'needs-kakao-link') {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href={hasOnboarded ? '/(tabs)' : '/onboarding'} />;
}
