import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius } from '../theme/tokens';

interface ButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({ children, onPress, disabled, loading, style }: PropsWithChildren<ButtonProps>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        // Explicit disabled colors rather than dimming the whole group's
        // opacity — composited-opacity text has shown up washed out to the
        // point of looking blank on some Android renders.
        { backgroundColor: disabled ? colors.surfaceHi : colors.yellow, opacity: !disabled && pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.yellowText} />
      ) : (
        <Text style={[styles.text, { color: disabled ? colors.textMid : colors.yellowText }]}>{children}</Text>
      )}
    </Pressable>
  );
}

export function CoralButton({ children, onPress, disabled, style }: PropsWithChildren<ButtonProps>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: disabled ? colors.surfaceHi : colors.coral, opacity: !disabled && pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[styles.text, { color: disabled ? colors.textMid : colors.coralText }]}>{children}</Text>
    </Pressable>
  );
}

export function GhostButton({ children, onPress, disabled, style }: PropsWithChildren<ButtonProps>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: colors.surface, opacity: !disabled && pressed ? 0.85 : disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.textMid }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 13.5, fontWeight: '700' },
});
