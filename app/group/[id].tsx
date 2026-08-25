import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../../src/components/Avatar';
import { ScreenGradient } from '../../src/components/ScreenGradient';
import { SectionLabel } from '../../src/components/SectionLabel';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, radius } from '../../src/theme/tokens';

export default function GroupManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groups = useAppStore((s) => s.groups);
  const friends = useAppStore((s) => s.friends);
  const authStatus = useAppStore((s) => s.authStatus);
  const refreshGroups = useAppStore((s) => s.refreshGroups);
  const refreshFriends = useAppStore((s) => s.refreshFriends);
  const addGroupMember = useAppStore((s) => s.addGroupMember);
  const removeGroupMember = useAppStore((s) => s.removeGroupMember);

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id]);
  const memberIds = useMemo(() => new Set((group?.members ?? []).map((m) => m.id)), [group]);
  const availableFriends = useMemo(() => friends.filter((f) => !memberIds.has(f.id)), [friends, memberIds]);

  useFocusEffect(
    useCallback(() => {
      if (authStatus === 'ready') {
        refreshGroups();
        refreshFriends();
      }
    }, [authStatus, refreshGroups, refreshFriends])
  );

  function closeScreen() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/settings');
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
                <Text style={styles.infoLine}>아직 이 그룹에 친구가 없어요. 아래에서 추가해보세요.</Text>
              ) : (
                (group.members ?? []).map((m) => {
                  const friend = friends.find((f) => f.id === m.id);
                  return (
                    <View key={m.id} style={styles.row}>
                      <View style={styles.personRow}>
                        {friend ? <Avatar gradient={friend.avatarGradient} size={34} /> : <View style={styles.fallbackAvatar} />}
                        <Text style={styles.t1}>{m.displayName}</Text>
                      </View>
                      <Pressable hitSlop={8} onPress={() => removeGroupMember(group.id, m.id)}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.textDim} />
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>

            <SectionLabel style={styles.sectionLabel}>친구 추가</SectionLabel>
            <View style={styles.block}>
              {availableFriends.length === 0 ? (
                <Text style={styles.infoLine}>추가할 수 있는 친구가 없어요.</Text>
              ) : (
                availableFriends.map((f) => (
                  <View key={f.id} style={styles.row}>
                    <View style={styles.personRow}>
                      <Avatar gradient={f.avatarGradient} size={34} />
                      <Text style={styles.t1}>{f.name}</Text>
                    </View>
                    <Pressable hitSlop={8} onPress={() => addGroupMember(group.id, f.id)}>
                      <Ionicons name="add-circle-outline" size={20} color={colors.yellow} />
                    </Pressable>
                  </View>
                ))
              )}
              {/* 그룹에 넣고 싶은 사람이 아직 친구가 아닐 때 — 여기서 바로 초대로 이어줌 */}
              <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => router.push('/add-friend')}>
                <Text style={styles.t1}>+ 새 친구 초대</Text>
              </Pressable>
            </View>
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
  navTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.textHi },
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
  t1: { fontSize: 13, fontWeight: '700', color: colors.textHi },
  infoLine: { fontSize: 10.5, color: colors.textDim, lineHeight: 17, padding: 15 },
});
