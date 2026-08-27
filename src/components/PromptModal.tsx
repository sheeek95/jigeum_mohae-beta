import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius } from '../theme/tokens';
import { GhostButton, PrimaryButton } from './Buttons';

interface PromptModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

// RN has no cross-platform prompt() — used for "새 그룹 만들기" and renaming.
export function PromptModal({ visible, title, placeholder, initialValue = '', confirmLabel = '확인', onCancel, onConfirm }: PromptModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textDim}
            style={styles.input}
            autoFocus
          />
          <View style={styles.actions}>
            <GhostButton onPress={onCancel} style={{ flex: 1 }}>
              취소
            </GhostButton>
            <PrimaryButton
              onPress={() => value.trim() && onConfirm(value.trim())}
              disabled={!value.trim()}
              style={{ flex: 1 }}
            >
              {confirmLabel}
            </PrimaryButton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { alignSelf: 'stretch', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 18 },
  title: { fontSize: 14, fontFamily: 'SCDream-ExtraBold', color: colors.textHi, marginBottom: 12 },
  input: {
    backgroundColor: colors.bgVoid,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: colors.textHi,
    fontSize: 13,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
