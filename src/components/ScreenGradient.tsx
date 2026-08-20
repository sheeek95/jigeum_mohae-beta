import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/tokens';

/**
 * Dark twilight gradient background shared by every screen, matching the
 * `linear-gradient(180deg,#1D1439,#120C24)` tone from the HTML mockup, with a
 * soft warm glow blob approximating the mockup's top-corner radial highlight.
 */
export function ScreenGradient({ children, glow = 'coral' }: PropsWithChildren<{ glow?: 'coral' | 'yellow' | 'none' }>) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#241A47', '#170F2C', '#0F0A1F']} style={StyleSheet.absoluteFill} />
      {glow !== 'none' && (
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            { backgroundColor: glow === 'coral' ? colors.coral : colors.yellow, opacity: glow === 'coral' ? 0.1 : 0.08 },
          ]}
        />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgVoid },
  glow: {
    position: 'absolute',
    top: -120,
    left: -60,
    width: 360,
    height: 300,
    borderRadius: 260,
  },
  content: { flex: 1 },
});
