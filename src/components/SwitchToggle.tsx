import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../theme/tokens';

export function SwitchToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={[styles.track, { backgroundColor: on ? colors.yellow : colors.surfaceHi }]}>
      <View style={[styles.thumb, { left: on ? 21 : 3 }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 42,
    height: 24,
    borderRadius: 20,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    top: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
});
