import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../../src/components/Avatar';
import { ScreenGradient } from '../../src/components/ScreenGradient';
import { SectionLabel } from '../../src/components/SectionLabel';
import { useAppStore } from '../../src/store/useAppStore';
import type { PendingGroupInvite } from '../../src/store/types';
import { colors, radius } from '../../src/theme/tokens';

const EMPTY_PENDING: PendingGroupInvite[] = [];

export default function GroupManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groups = useAppStore((s) => s.groups);
  const friends = useAppStore((s) => s.friends);
  const authStatus = useAppStore((s) => s.authStatus);
  const refreshGroups = useAppStore((s) => s.refreshGroups);
  const refreshFriends = useAppStore((s) => s.refreshFriends);
  const inviteGroupMember = useAppStore((s) => s.inviteGroupMember);
  const removeGroupMember = useAppStore((s) => s.removeGroupMember);
  const fetchGroupPendingInvites = useAppStore((s) => s.fetchGroupPendingInvites);
  const pendingInvites = useAppStore((s) => s.groupPendingInvites[id ?? ''] ?? EMPTY_PENDING);

  const [invitingId, setInvitingId] = useState<string | null>(null);

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id]);
  const pendingIds = useMemo(() => new Set(pendingInvites.map((i) => i.userId)), [pendingInvites]);
  const memberIds = useMemo(() => new Set((group?.members ?? []).map((m) => m.id)), [group]);
  const availableFriends = useMemo(
    () => friends.filter((f) => !memberIds.has(f.id) && !pendingIds.has(f.id)),
    [friends, memberIds, pendingIds]
  );

  useFocusEffect(
    useCallback(() => {
      if (authStatus !== 'ready') return;
      refreshGroups();
      refreshFriends();
      if (id) fetchGroupPendingInvites(id).catch(() => {});
    }, [authStatus, refreshGroups, refreshFriends, fetchGroupPendingInvites, id])
  );

  function closeScreen() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/settings');
  }

  async function handleInvite(groupId: string, friendId: string) {
    setInvitingId(friendId);
    try {
      await inviteGroupMember(groupId, friendId);
    } catch (err) {
      Alert.alert('초대하지 못했어요', err instanceof Error ? err.message : undefined);
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <ScreenGradient glow="coral">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.nav}>
          <Pressable style={styles.navIcon} onPress={closeScreen} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.textMid} />
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={1}>
            {group?.name ?? '그룹 관리'}
          </Text>
          <View style={styles.navIcon} />
        </View>

        {!group ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>그룹을 찾을 수 없어요</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <SectionLabel style={styles.sectionLabel}>{`그룹 멤버 · ${group.members?.length ?? 0}명`}</SectionLabel>
            <View style={styles.block}>
              {(group.members ?? []).length === 0 ? (
                <Text style={styles.infoLine}>
                  {group.isOwner ? '아직 이 그룹에 친구가 없어요. 아래에서 초대해보세요.' : '아직 이 그룹에 다른 멤버가 없어요.'}
                </Text>
              ) : (
                (group.members ?? []).map((m) => {
                  const friend = friends.find((f) => f.id === m.id);
                  return (
                    <View key={m.id} style={styles.row}>
                      <View style={styles.personRow}>
                        {friend ? <Avatar gradient={friend.avatarGradient} size={34} /> : <View style={styles.fallbackAvatar} />}
                        <Text style={styles.t1}>{m.displayName}</Text>
                      </View>
                      {group.isOwner && (
                        <Pressable hitSlop={8} onPress={() => removeGroupMember(group.id, m.id)}>
                          <Ionicons name="close-circle-outline" size={20} color={colors.textDim} />
                        </Pressable>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {!group.isOwner ? (
              <Text style={[styles.infoLine, { paddingHorizontal: 20 }]}>
                그룹장만 멤버를 초대하거나 내보낼 수 있어요.
              </Text>
            ) : (
              <>
                {pendingInvites.length > 0 && (
                  <>
                    <SectionLabel style={styles.sectionLabel}>초대 대기중</SectionLabel>
                    <View style={styles.block}>
                      {pendingInvites.map((inv) => {
                        const friend = friends.find((f) => f.id === inv.userId);
                        return (
                          <View key={inv.id} style={styles.row}>
                            <View style={styles.personRow}>
                              {friend ? <Avatar gradient={friend.avatarGradient} size={34} /> : <View style={styles.fallbackAvatar} />}
                              <Text style={styles.t1}>{inv.displayName}</Text>
                            </View>
                            <Text style={styles.pendingText}>수락 대기중</Text>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}

                <SectionLabel style={styles.sectionLabel}>친구 초대</SectionLabel>
                <View style={styles.block}>
                  {availableFriends.length === 0 ? (
                    <Text style={styles.infoLine}>초대할 수 있는 친구가 없어요.</Text>
                  ) : (
                    availableFriends.map((f) => (
                      <View key={f.id} style={styles.row}>
                        <View style={styles.personRow}>
                          <Avatar gradient={f.avatarGradient} size={34} />
                          <Text style={styles.t1}>{f.name}</Text>
                        </View>
                        {invitingId === f.id ? (
                          <Ionicons name="hourglass-outline" size={18} color={colors.textDim} />
                        ) : (
                          <Pressable hitSlop={8} onPress={() => handleInvite(group.id, f.id)}>
                            <Ionicons name="add-circle-outline" size={20} color={colors.yellow} />
                          </Pressable>
                        )}
                      </View>
                    ))
                  )}
                  {/* 그룹에 넣고 싶은 사람이 아직 친구가 아닐 때 — 여기서 바로 초대로 이어줌 */}
                  <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => router.push('/add-friend')}>
                    <Text style={styles.t1}>+ 새 친구 초대</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  nav: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontFamily: 'SCDream-ExtraBold', color: colors.textHi },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textDim, fontSize: 13 },
  sectionLabel: { marginHorizontal: 20, marginTop: 14, marginBottom: 2 },
  block: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fallbackAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceHi },
  t1: { fontSize: 13, fontFamily: 'SCDream-Bold', color: colors.textHi },
  infoLine: { fontSize: 10.5, color: colors.textDim, lineHeight: 17, padding: 15 },
  pendingText: { fontSize: 10.5, color: colors.textDim, fontFamily: 'SCDream-Medium' },
});
