import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenGradient } from '../src/components/ScreenGradient';
import { useAppStore } from '../src/store/useAppStore';
import type { GroupInvite } from '../src/store/types';
import { colors, radius } from '../src/theme/tokens';
import { formatRelative } from '../src/utils/time';

export default function GroupInvitesScreen() {
  const groupInvites = useAppStore((s) => s.groupInvites);
  const refreshGroupInvites = useAppStore((s) => s.refreshGroupInvites);
  const respondToGroupInvite = useAppStore((s) => s.respondToGroupInvite);
  const authStatus = useAppStore((s) => s.authStatus);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (authStatus !== 'ready') return;
    setLoadError(null);
    refreshGroupInvites()
      .catch((err) => setLoadError(err instanceof Error ? err.message : '초대를 불러오지 못했어요'))
      .finally(() => setLoading(false));
  }, [authStatus, refreshGroupInvites]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRespond(invite: GroupInvite, approve: boolean) {
    setRespondingId(invite.id);
    try {
      await respondToGroupInvite(invite.id, approve);
    } catch (err) {
      Alert.alert('처리하지 못했어요', err instanceof Error ? err.message : undefined);
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <ScreenGradient glow="coral">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>그룹 초대</Text>
          <Pressable style={styles.navIcon} onPress={() => router.back()}>
            <Ionicons name="close" size={18} color={colors.textMid} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.coral} style={{ marginTop: 40 }} />
        ) : loadError ? (
          <View style={styles.centerWrap}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : groupInvites.length === 0 ? (
          <View style={styles.centerWrap}>
            <Text style={styles.emptyText}>받은 그룹 초대가 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={groupInvites}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{item.groupName}</Text>
                  <Text style={styles.subText}>
                    {item.inviterName}님이 초대했어요 · {formatRelative(item.createdAt)}
                  </Text>
                </View>
                {respondingId === item.id ? (
                  <ActivityIndicator color={colors.coral} />
                ) : (
                  <View style={styles.actionsRow}>
                    <Pressable style={styles.declineBtn} onPress={() => handleRespond(item, false)}>
                      <Text style={styles.declineBtnText}>거절</Text>
                    </Pressable>
                    <Pressable style={styles.acceptBtn} onPress={() => handleRespond(item, true)}>
                      <Text style={styles.acceptBtnText}>수락</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navTitle: { fontSize: 16, fontFamily: 'SCDream-ExtraBold', color: colors.textHi },
  navIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  errorText: { fontSize: 12.5, color: colors.textMid, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.surfaceHi, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  retryBtnText: { fontSize: 12.5, fontFamily: 'SCDream-Bold', color: colors.textHi },
  emptyText: { color: colors.textDim, fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  groupName: { fontSize: 14, fontFamily: 'SCDream-Bold', color: colors.textHi },
  subText: { fontSize: 11, color: colors.textDim, marginTop: 3 },
  actionsRow: { flexDirection: 'row', gap: 6 },
  declineBtn: { backgroundColor: colors.surfaceHi, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  declineBtnText: { fontSize: 11.5, fontFamily: 'SCDream-Bold', color: colors.textMid },
  acceptBtn: { backgroundColor: colors.yellow, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  acceptBtnText: { fontSize: 11.5, fontFamily: 'SCDream-Bold', color: colors.yellowText },
});
