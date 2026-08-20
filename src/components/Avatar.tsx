import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import type { AvatarGradient } from '../store/types';
import { colors } from '../theme/tokens';

export function Avatar({
  gradient,
  size = 42,
  dnd = false,
}: {
  gradient: AvatarGradient;
  size?: number;
  dnd?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
      {dnd && (
        <View
          style={[
            styles.dndDot,
            {
              width: size * 0.29,
              height: size * 0.29,
              borderRadius: size * 0.145,
              right: -1,
              bottom: -1,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dndDot: {
    position: 'absolute',
    backgroundColor: '#4A4066',
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
