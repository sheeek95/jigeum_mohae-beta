import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/tokens';

export function Checkbox({ on }: { on: boolean }) {
  return (
    <View style={[styles.box, on && styles.on]}>{on && <Text style={styles.check}>✓</Text>}</View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  check: { fontSize: 12, fontWeight: '700', color: colors.yellowText },
});
