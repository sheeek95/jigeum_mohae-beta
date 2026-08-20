import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenGradient } from '../../src/components/ScreenGradient';
import { useAppStore } from '../../src/store/useAppStore';
import type { AlbumItem } from '../../src/store/types';
import { colors, radius } from '../../src/theme/tokens';
import { formatCountdown, formatRelative } from '../../src/utils/time';

const STATUS_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: '저장 승인 대기중', bg: 'rgba(255,214,102,0.14)', fg: colors.yellow },
  approved: { label: '저장됨 ✓', bg: 'rgba(160,255,217,0.12)', fg: '#A0FFD9' },
  rejected: { label: '저장 거절됨', bg: 'rgba(255,111,129,0.14)', fg: colors.coral },
};

function ItemActions({
  item,
  onRequestSave,
  onResolve,
}: {
  item: AlbumItem;
  onRequestSave: () => void;
  onResolve: (approve: boolean) => void;
}) {
  if (item.direction === 'received') {
    if (item.saveStatus === 'none') {
      return (
        <Pressable style={styles.requestBtn} onPress={onRequestSave}>
          <Text style={styles.requestBtnText}>저장 요청</Text>
        </Pressable>
      );
    }
    const badge = STATUS_BADGE[item.saveStatus];
    if (!badge) return null;
    return (
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
      </View>
    );
  }

  // direction === 'sent': a PENDING save request needs my (the sender's) approval.
  if (item.saveStatus === 'pending') {
    return (
      <View style={styles.resolveRow}>
        <Pressable style={styles.rejectBtn} onPress={() => onResolve(false)}>
          <Text style={styles.rejectBtnText}>거절</Text>
        </Pressable>
        <Pressable style={styles.approveBtn} onPress={() => onResolve(true)}>
          <Text style={styles.approveBtnText}>승인</Text>
        </Pressable>
      </View>
    );
  }
  const badge = STATUS_BADGE[item.saveStatus];
  if (!badge) return null;
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
    </View>
  );
}

export default function AlbumScreen() {
  const album = useAppStore((s) => s.album);
  const requestSave = useAppStore((s) => s.requestSave);
  const resolveSave = useAppStore((s) => s.resolveSave);
  const refreshAlbum = useAppStore((s) => s.refreshAlbum);
  const authStatus = useAppStore((s) => s.authStatus);
  const [, forceTick] = useState(0);

  // Re-render periodically so the 24h countdown stays live.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (authStatus === 'ready') refreshAlbum();
    }, [authStatus, refreshAlbum])
  );

  return (
    <ScreenGradient glow="coral">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>앨범</Text>
        </View>

        {album.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 주고받은 사진이 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={album}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Image source={{ uri: item.photoUrl }} style={styles.thumb} contentFit="cover" />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.peer}>
                      {item.direction === 'received' ? `${item.peerName} 보냄` : `${item.peerName}에게 보냄`}
                    </Text>
                    <Text style={styles.time}>{formatRelative(item.sentAt)}</Text>
                  </View>
                  <Text style={styles.caption} numberOfLines={1}>
                    &ldquo;{item.caption || '(캡션 없음)'}&rdquo;
                  </Text>
                  <View style={styles.cardBottom}>
                    <Text style={styles.expire}>{formatCountdown(item.expiresAt)}</Text>
                    <ItemActions
                      item={item}
                      onRequestSave={() => requestSave(item.photoId)}
                      onResolve={(approve) => item.targetUserId && resolveSave(item.photoId, item.targetUserId, approve)}
                    />
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  navTitle: { fontSize: 18, fontWeight: '800', color: colors.textHi },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textDim, fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    gap: 12,
  },
  thumb: { width: 64, height: 64, borderRadius: 14, backgroundColor: colors.surfaceHi },
  cardBody: { flex: 1, justifyContent: 'center', gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  peer: { fontSize: 13, fontWeight: '700', color: colors.textHi },
  time: { fontSize: 10.5, color: colors.textDim },
  caption: { fontSize: 12, color: colors.textMid },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  expire: { fontSize: 10, color: colors.textDim, fontWeight: '600' },
  requestBtn: { backgroundColor: colors.surfaceHi, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  requestBtnText: { fontSize: 10.5, fontWeight: '700', color: colors.textMid },
  badge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 10.5, fontWeight: '700' },
  resolveRow: { flexDirection: 'row', gap: 6 },
  rejectBtn: { backgroundColor: colors.surfaceHi, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  rejectBtnText: { fontSize: 10.5, fontWeight: '700', color: colors.textMid },
  approveBtn: { backgroundColor: colors.yellow, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  approveBtnText: { fontSize: 10.5, fontWeight: '700', color: colors.yellowText },
});
