import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../../src/components/Avatar';
import { PulseRing } from '../../src/components/PulseRing';
import { ScreenGradient } from '../../src/components/ScreenGradient';
import { useAppStore } from '../../src/store/useAppStore';
import type { AlbumItem, Group } from '../../src/store/types';
import { colors, radius } from '../../src/theme/tokens';
import { formatRelative } from '../../src/utils/time';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const POLL_MS = 6000;
const AVATAR_PEEK = 3;

function GroupCard({ group, latest }: { group: Group; latest: AlbumItem | undefined }) {
  const friends = useAppStore((s) => s.friends);
  const members = group.members ?? [];
  const shown = members.slice(0, AVATAR_PEEK);
  const overflow = members.length - shown.length;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          <View style={styles.badgeDot} />
          <Text style={styles.cardTitle}>{group.name}</Text>
          <Text style={styles.cardMemberCount}>· {group.memberCount}명</Text>
        </View>
        <View style={styles.avatarRow}>
          {shown.map((m, i) => {
            const friend = friends.find((f) => f.id === m.id);
            return (
              <View key={m.id} style={[styles.avatarStack, i > 0 && styles.avatarOverlap]}>
                <Avatar gradient={friend?.avatarGradient ?? (['#33234F', '#33234F'] as const)} size={22} />
              </View>
            );
          })}
          {overflow > 0 && (
            <View style={[styles.avatarStack, styles.avatarOverlap, styles.avatarOverflow]}>
              <Text style={styles.avatarOverflowText}>+{overflow}</Text>
            </View>
          )}
        </View>
      </View>

      {latest ? (
        <View style={styles.cardPhotoBox}>
          <Image source={{ uri: latest.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, styles.cardPhotoOverlay]} />
          <View style={styles.cardPhotoCaption}>
            <Text style={styles.cardPhotoTime}>{formatRelative(latest.sentAt)}</Text>
            {!!latest.caption && (
              <Text style={styles.cardPhotoText} numberOfLines={1}>
                &ldquo;{latest.caption}&rdquo;
              </Text>
            )}
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.cardWaitingBox}
          onPress={() => router.push({ pathname: '/camera', params: { presetGroupId: group.id } })}
        >
          <PulseRing size={38} />
          <Text style={styles.cardWaitingTxt}>기다리는 중...</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.registerBtn}
        onPress={() => router.push({ pathname: '/camera', params: { presetGroupId: group.id } })}
      >
        <Ionicons name="camera-outline" size={14} color={colors.coral} />
        <Text style={styles.registerBtnText}>{group.name}에게 사진 등록</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const now = useClock();
  const allGroups = useAppStore((s) => s.groups);
  const groups = useMemo(() => allGroups.filter((g) => g.kind === 'group'), [allGroups]);
  const album = useAppStore((s) => s.album);
  const refreshGroups = useAppStore((s) => s.refreshGroups);
  const refreshFriends = useAppStore((s) => s.refreshFriends);
  const refreshAlbum = useAppStore((s) => s.refreshAlbum);
  const refreshWidget = useAppStore((s) => s.refreshWidget);
  const authStatus = useAppStore((s) => s.authStatus);

  // Keeps the home-screen native widget's own data fresh in the background —
  // it shows a single cross-group "latest photo" and is a separate surface
  // from this per-group card list (see refreshWidget in useAppStore.ts).
  useFocusEffect(
    useCallback(() => {
      if (authStatus !== 'ready') return;
      refreshGroups();
      refreshFriends();
      refreshAlbum();
      refreshWidget();
      const id = setInterval(() => {
        refreshAlbum();
        refreshWidget();
      }, POLL_MS);
      return () => clearInterval(id);
    }, [authStatus, refreshGroups, refreshFriends, refreshAlbum, refreshWidget])
  );

  const latestByGroup = useMemo(() => {
    const map = new Map<string, AlbumItem>();
    const nowMs = Date.now();
    for (const item of album) {
      if (item.direction !== 'sent' || !item.groupId || item.expiresAt <= nowMs) continue;
      if (!map.has(item.groupId)) map.set(item.groupId, item);
    }
    return map;
  }, [album]);

  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const dateLabel = `${WEEKDAYS[now.getDay()]} ${now.getMonth() + 1}월 ${now.getDate()}일`;

  return (
    <ScreenGradient glow="yellow">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>홈</Text>
          <Pressable style={styles.navIcon} onPress={() => router.push('/add-friend')}>
            <Ionicons name="person-add-outline" size={16} color={colors.textMid} />
          </Pressable>
        </View>

        <View style={styles.timeHero}>
          <Text style={styles.time}>{hh}:{mm}</Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>

        {groups.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.block}>
              <Text style={styles.infoLine}>아직 친구가 없어요{'\n'}친구를 추가해 순간을 공유해보세요!</Text>
              <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => router.push('/add-friend')}>
                <Text style={styles.t1}>+ 친구 추가</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} latest={latestByGroup.get(g.id)} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navTitle: { fontSize: 18, fontWeight: '800', color: colors.textHi },
  navIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  timeHero: { alignItems: 'center', marginTop: 10, marginBottom: 14 },
  time: { fontSize: 40, fontWeight: '700', color: colors.textHi, letterSpacing: -1 },
  date: { fontSize: 12.5, color: colors.textMid, marginTop: 2 },
  emptyWrap: { paddingTop: 10 },
  block: {
    marginHorizontal: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  infoLine: { fontSize: 10.5, color: colors.textDim, lineHeight: 17, padding: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  t1: { fontSize: 13, fontWeight: '700', color: colors.textHi },
  list: { paddingHorizontal: 18, paddingBottom: 24, gap: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.coral },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textHi },
  cardMemberCount: { fontSize: 10.5, color: colors.textDim },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarStack: { borderRadius: 12, borderWidth: 2, borderColor: colors.surface },
  avatarOverlap: { marginLeft: -8 },
  avatarOverflow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverflowText: { fontSize: 8.5, fontWeight: '700', color: colors.textMid },
  cardPhotoBox: { height: 132, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.surfaceHi, justifyContent: 'flex-end' },
  cardPhotoOverlay: { backgroundColor: 'rgba(0,0,0,0.2)' },
  cardPhotoCaption: { padding: 10 },
  cardPhotoTime: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
  cardPhotoText: { fontSize: 10.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  cardWaitingBox: {
    height: 92,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255,214,102,0.45)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,214,102,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cardWaitingTxt: { fontSize: 12, fontWeight: '700', color: colors.yellow },
  registerBtn: {
    marginTop: 9,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.coralDim,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  registerBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.coral },
});
