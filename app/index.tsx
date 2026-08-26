import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/tokens';

export default function Index() {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const authStatus = useAppStore((s) => s.authStatus);

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

  // No usable session (brand new install, or one that needs to link an
  // existing pre-Kakao account) — onboarding's final step handles login,
  // regardless of whether this device has been through onboarding before.
  if (authStatus === 'needs-login' || authStatus === 'needs-kakao-link') {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href={hasOnboarded ? '/(tabs)' : '/onboarding'} />;
}
