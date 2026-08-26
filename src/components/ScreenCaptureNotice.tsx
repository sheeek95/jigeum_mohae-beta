import { StyleSheet, Text, TextStyle } from 'react-native';

import { colors } from '../theme/tokens';

// Pairs with useScreenCaptureBlock() — shown on the same screens so the
// block isn't a silent surprise when a screenshot attempt does nothing.
export function ScreenCaptureNotice({ style }: { style?: TextStyle }) {
  return <Text style={[styles.text, style]}>이 페이지는 화면 캡쳐를 사용할 수 없어요.</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11.5,
    color: colors.textDim,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
