import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { colors, radius } from '../theme/tokens';

export function Toast({
  visible,
  message,
  variant = 'coral',
}: {
  visible: boolean;
  message: string;
  variant?: 'coral' | 'yellow';
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.base,
        variant === 'coral' ? styles.coral : styles.yellow,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <Text style={[styles.text, variant === 'coral' ? styles.textCoral : styles.textYellow]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  coral: { backgroundColor: colors.coral },
  yellow: { backgroundColor: colors.surfaceHi, borderWidth: 1, borderColor: 'rgba(255,214,102,0.4)' },
  text: { fontFamily: 'SCDream-Bold', fontSize: 13 },
  textCoral: { color: colors.coralText },
  textYellow: { color: colors.yellow },
});
