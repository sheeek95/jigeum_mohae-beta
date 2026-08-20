import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ScreenGradient } from '../../src/components/ScreenGradient';
import { useAppStore } from '../../src/store/useAppStore';
import type { AlbumItem, SaveRequestStatus } from '../../src/store/types';
import { colors, radius } from '../../src/theme/tokens';
import { formatCountdown, formatRelative } from '../../src/utils/time';

function SaveBadge({ item, onRequest }: { item: AlbumItem; onRequest: () => void }) {
  if (item.direction === 'sent') return null;
  const map: Record<SaveRequestStatus, { label: string; bg: string; fg: string } | null> = {
    none: null,
    pending: { label: '저장 승인 대기중', bg: 'rgba(255,214,102,0.14)', fg: colors.yellow },
    approved: { label: '저장됨 ✓', bg: 'rgba(160,255,217,0.12)', fg: '#A0FFD9' },
    rejected: { label: '저장 거절됨', bg: 'rgba(255,111,129,0.14)', fg: colors.coral },
  };
  const badge = map[item.saveStatus];
  if (item.saveStatus === 'none') {
    return (
      <Pressable style={styles.requestBtn} onPress={onRequest}>
        <Text style={styles.requestBtnText}>저장 요청</Text>
      </Pressable>
    );
  }
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
  const [, forceTick] = useState(0);

  // Re-render periodically so the 24h countdown stays live.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

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
                <LinearGradient colors={item.gradient} style={styles.thumb} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.peer}>
                      {item.direction === 'received' ? `${item.peerName} 보냄` : `${item.peerName}에게 보냄`}
                    </Text>
                    <Text style={styles.time}>{formatRelative(item.sentAt)}</Text>
                  </View>
                  <Text style={styles.caption} numberOfLines={1}>
                    &ldquo;{item.caption}&rdquo;
                  </Text>
                  <View style={styles.cardBottom}>
                    <Text style={styles.expire}>{formatCountdown(item.expiresAt)}</Text>
                    <SaveBadge item={item} onRequest={() => requestSave(item.id)} />
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
  thumb: { width: 64, height: 64, borderRadius: 14 },
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
});
