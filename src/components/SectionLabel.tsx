import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors } from '../theme/tokens';

export function SectionLabel({ children, style }: { children: string; style?: ViewStyle }) {
  return (
    <View style={style}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 11, color: colors.textDim, fontWeight: '700' },
});
