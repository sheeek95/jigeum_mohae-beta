import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../src/components/Buttons';
import { Checkbox } from '../src/components/Checkbox';
import { SectionLabel } from '../src/components/SectionLabel';
import { Toast } from '../src/components/Toast';
import { useAppStore } from '../src/store/useAppStore';
import { colors, radius } from '../src/theme/tokens';

export default function ShareScreen() {
  const groups = useAppStore((s) => s.groups);
  const capturedPhoto = useAppStore((s) => s.capturedPhoto);
  const shareToTargets = useAppStore((s) => s.shareToTargets);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [toastVisible, setToastVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupTargets = useMemo(() => groups.filter((g) => g.kind === 'group'), [groups]);
  const personalTargets = useMemo(() => groups.filter((g) => g.kind === 'personal'), [groups]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleShare() {
    if (selected.size === 0 || sharing) return;
    setSharing(true);
    setError(null);
    try {
      await shareToTargets(Array.from(selected));
      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
        router.replace('/(tabs)');
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '공유에 실패했어요');
      setSharing(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>누구에게 보낼까요</Text>
          <Pressable style={styles.navIcon} onPress={() => router.back()}>
            <Ionicons name="close" size={18} color={colors.textMid} />
          </Pressable>
        </View>

        <View style={styles.previewWrap}>
          {capturedPhoto && <Image source={{ uri: capturedPhoto.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
          <View style={styles.expireTag}>
            <Text style={styles.expireTagText}>24시간 후 자동 삭제</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {groupTargets.length === 0 && personalTargets.length === 0 ? (
            <Text style={styles.emptyText}>아직 공유할 친구나 그룹이 없어요</Text>
          ) : (
            <>
              {groupTargets.length > 0 && <SectionLabel>그룹</SectionLabel>}
              {groupTargets.map((g) => (
                <Pressable key={g.id} style={styles.row} onPress={() => toggle(g.id)}>
                  <Checkbox on={selected.has(g.id)} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gName}>{g.name}</Text>
                    <Text style={styles.gSub}>친구 {g.memberCount}명</Text>
                  </View>
                </Pressable>
              ))}

              {personalTargets.length > 0 && <SectionLabel style={{ marginTop: 6 }}>개인</SectionLabel>}
              {personalTargets.map((g) => (
                <Pressable key={g.id} style={styles.row} onPress={() => toggle(g.id)}>
                  <Checkbox on={selected.has(g.id)} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gName}>{g.name}</Text>
                    <Text style={[styles.gSub, g.dnd && styles.dndFlag]}>
                      {g.dnd ? '방해금지 중 · 알림 지연' : g.subLabel}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={styles.cta}>
          <PrimaryButton onPress={handleShare} disabled={selected.size === 0} loading={sharing} style={{ width: '100%' }}>
            공유하기
          </PrimaryButton>
        </View>

        <Toast visible={toastVisible} message="위젯에 바로 떴어요 ✓" variant="yellow" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgVoid },
  nav: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navTitle: { fontSize: 16, fontWeight: '800', color: colors.textHi },
  navIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  previewWrap: { marginHorizontal: 16, height: 160, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surfaceHi },
  expireTag: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  expireTagText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 11, borderWidth: 1, borderColor: colors.line },
  gName: { fontSize: 13, fontWeight: '700', color: colors.textHi },
  gSub: { fontSize: 10.5, color: colors.textDim, marginTop: 1 },
  dndFlag: { color: colors.coral, fontWeight: '700' },
  emptyText: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginTop: 40 },
  errorText: { color: colors.coral, fontSize: 11.5, textAlign: 'center', marginTop: 8 },
  cta: { paddingHorizontal: 16, paddingBottom: 10 },
});
