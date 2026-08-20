import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../../src/components/Avatar';
import { CoralButton, GhostButton } from '../../src/components/Buttons';
import { Checkbox } from '../../src/components/Checkbox';
import { ScreenGradient } from '../../src/components/ScreenGradient';
import { SectionLabel } from '../../src/components/SectionLabel';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/tokens';

export default function InviteAcceptScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const pendingInvite = useAppStore((s) => s.pendingInvite);
  const loadInviteByCode = useAppStore((s) => s.loadInviteByCode);
  const acceptInvite = useAppStore((s) => s.acceptInvite);
  const clearPendingInvite = useAppStore((s) => s.clearPendingInvite);
  const groups = useAppStore((s) => s.groups);
  const authStatus = useAppStore((s) => s.authStatus);
  const bootstrap = useAppStore((s) => s.bootstrap);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const groupTargets = useMemo(() => groups.filter((g) => g.kind === 'group'), [groups]);

  // Hitting this screen straight from a shared link (cold launch) can race the
  // root layout's device-auth bootstrap — wait for it before calling the API.
  useEffect(() => {
    if (authStatus === 'idle') bootstrap();
  }, [authStatus, bootstrap]);

  useEffect(() => {
    if (!code || authStatus !== 'ready') return;
    setLoading(true);
    loadInviteByCode(code)
      .catch((err) => setError(err instanceof Error ? err.message : '초대 링크를 불러올 수 없어요'))
      .finally(() => setLoading(false));
    return () => clearPendingInvite();
  }, [code, authStatus, loadInviteByCode, clearPendingInvite]);

  useEffect(() => {
    if (authStatus === 'error') {
      setError('연결에 실패했어요. 다시 시도해주세요');
      setLoading(false);
    }
  }, [authStatus]);

  async function accept() {
    if (!code) return;
    setBusy(true);
    try {
      await acceptInvite(code, selectedGroupId ? [selectedGroupId] : undefined);
      router.replace('/(tabs)/poke');
    } catch (err) {
      setError(err instanceof Error ? err.message : '수락에 실패했어요');
    } finally {
      setBusy(false);
    }
  }

  function decline() {
    clearPendingInvite();
    router.back();
  }

  return (
    <ScreenGradient glow="coral">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>친구 등록</Text>
          <Pressable style={styles.navIcon} onPress={() => router.back()}>
            <Ionicons name="close" size={18} color={colors.textMid} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator color={colors.coral} />
          ) : error || !pendingInvite ? (
            <Text style={styles.errorText}>{error ?? '유효하지 않은 초대예요'}</Text>
          ) : !pendingInvite.valid ? (
            <Text style={styles.errorText}>
              {pendingInvite.isSelf ? '내가 만든 링크는 사용할 수 없어요' : '만료되었거나 이미 사용된 링크예요'}
            </Text>
          ) : (
            <View style={styles.incomingCard}>
              <Avatar gradient={[pendingInvite.inviter.avatarStart, pendingInvite.inviter.avatarEnd]} size={56} />
              <Text style={styles.incomingTitle}>{pendingInvite.inviter.displayName}님이 초대 링크로 들어왔어요</Text>
              <Text style={styles.incomingSub}>수락하면 서로의 위젯에 사진을 공유할 수 있어요</Text>

              {groupTargets.length > 0 && (
                <View style={styles.incomingGroup}>
                  <SectionLabel style={{ marginBottom: 6 }}>추가할 그룹 선택 (선택)</SectionLabel>
                  {groupTargets.map((g) => (
                    <Pressable
                      key={g.id}
                      style={styles.groupRow}
                      onPress={() => setSelectedGroupId((cur) => (cur === g.id ? null : g.id))}
                    >
                      <Checkbox on={selectedGroupId === g.id} />
                      <View>
                        <Text style={styles.gName}>{g.name}</Text>
                        <Text style={styles.gSub}>친구 {g.memberCount}명</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.incomingActions}>
                <GhostButton onPress={decline} disabled={busy}>거절</GhostButton>
                <CoralButton onPress={accept} disabled={busy}>{busy ? '처리 중…' : '친구 수락'}</CoralButton>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navTitle: { fontSize: 16, fontWeight: '800', color: colors.textHi },
  navIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
  incomingCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  incomingTitle: { fontSize: 14, fontWeight: '800', color: colors.textHi, marginTop: 12, textAlign: 'center' },
  incomingSub: { fontSize: 11.5, color: colors.textDim, marginTop: 4, textAlign: 'center' },
  incomingGroup: { alignSelf: 'stretch', marginTop: 16 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgVoid, borderRadius: 16, padding: 11, borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
  gName: { fontSize: 13, fontWeight: '700', color: colors.textHi },
  gSub: { fontSize: 10.5, color: colors.textDim },
  incomingActions: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
});
