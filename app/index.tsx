import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/tokens';

export default function Index() {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAppStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgVoid, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  return <Redirect href={hasOnboarded ? '/(tabs)' : '/onboarding'} />;
}
