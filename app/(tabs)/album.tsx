import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenGradient } from '../../src/components/ScreenGradient';
import { useScreenCaptureBlock } from '../../src/hooks/useScreenCaptureBlock';
import { useAppStore } from '../../src/store/useAppStore';
import type { SavedPhotoItem, SentPhotoItem } from '../../src/store/types';
import { colors, radius } from '../../src/theme/tokens';
import { formatCountdown, formatRelative } from '../../src/utils/time';

const STATUS_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: '저장 승인 대기중', bg: 'rgba(255,214,102,0.14)', fg: colors.yellow },
  approved: { label: '저장됨 ✓', bg: 'rgba(160,255,217,0.12)', fg: '#A0FFD9' },
  rejected: { label: '저장 거절됨', bg: 'rgba(255,111,129,0.14)', fg: colors.coral },
};

function SentCard({
  item,
  onDelete,
  onResolve,
}: {
  item: SentPhotoItem;
  onDelete: () => void;
  onResolve: (approve: boolean) => void;
}) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: item.photoUrl }} style={styles.thumb} contentFit="cover" />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.peer}>{item.peerName}에게 보냄</Text>
          <View style={styles.cardTopRight}>
            <Text style={styles.time}>{formatRelative(item.sentAt)}</Text>
            <Pressable style={styles.deleteBtn} hitSlop={8} onPress={onDelete}>
              <Ionicons name="trash-outline" size={14} color={colors.textDim} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.caption} numberOfLines={1}>
          &ldquo;{item.caption || '(캡션 없음)'}&rdquo;
        </Text>
        <View style={styles.cardBottom}>
          <Text style={styles.expire}>{formatCountdown(item.expiresAt)}</Text>
          {item.saveStatus === 'pending' ? (
            <View style={styles.resolveRow}>
              <Pressable style={styles.rejectBtn} onPress={() => onResolve(false)}>
                <Text style={styles.rejectBtnText}>거절</Text>
              </Pressable>
              <Pressable style={styles.approveBtn} onPress={() => onResolve(true)}>
                <Text style={styles.approveBtnText}>승인</Text>
              </Pressable>
            </View>
          ) : (
            STATUS_BADGE[item.saveStatus] && (
              <View style={[styles.badge, { backgroundColor: STATUS_BADGE[item.saveStatus].bg }]}>
                <Text style={[styles.badgeText, { color: STATUS_BADGE[item.saveStatus].fg }]}>
                  {STATUS_BADGE[item.saveStatus].label}
                </Text>
              </View>
            )
          )}
        </View>
        {item.comments.length > 0 && (
          <View style={styles.reactionRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.textDim} />
            <Text style={styles.reactionText} numberOfLines={1}>
              {item.comments.map((c) => `${c.displayName}: ${c.text}`).join(' · ')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function SavedCard({ item }: { item: SavedPhotoItem }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: item.photoUrl }} style={styles.thumb} contentFit="cover" />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.peer}>
            {item.peerName}님이 보낸 사진{item.groupName ? ` · ${item.groupName}` : ''}
          </Text>
          <Text style={styles.time}>{item.savedAt ? formatRelative(item.savedAt) : ''}</Text>
        </View>
        <Text style={styles.caption} numberOfLines={1}>
          &ldquo;{item.caption || '(캡션 없음)'}&rdquo;
        </Text>
      </View>
    </View>
  );
}

export default function AlbumScreen() {
  useScreenCaptureBlock();
  const [tab, setTab] = useState<'sent' | 'saved'>('sent');
  const sentPhotos = useAppStore((s) => s.sentPhotos);
  const savedPhotos = useAppStore((s) => s.savedPhotos);
  const resolveSave = useAppStore((s) => s.resolveSave);
  const deleteSentPhoto = useAppStore((s) => s.deleteSentPhoto);
  const refreshAlbum = useAppStore((s) => s.refreshAlbum);
  const authStatus = useAppStore((s) => s.authStatus);
  const [, forceTick] = useState(0);

  function confirmDelete(photoId: string, peerName: string) {
    Alert.alert('사진을 삭제할까요?', `${peerName}에게 보낸 사진이 상대 화면에서도 바로 사라져요.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteSentPhoto(photoId) },
    ]);
  }

  async function handleResolveSave(photoId: string, targetUserId: string, approve: boolean) {
    try {
      await resolveSave(photoId, targetUserId, approve);
    } catch (err) {
      Alert.alert('처리하지 못했어요', err instanceof Error ? err.message : undefined);
    }
  }

  // Re-render periodically so the sent tab's 24h countdown stays live.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (authStatus === 'ready') refreshAlbum();
    }, [authStatus, refreshAlbum])
  );

  const items = tab === 'sent' ? sentPhotos : savedPhotos;

  return (
    <ScreenGradient glow="coral">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>앨범</Text>
        </View>

        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, tab === 'sent' && styles.tabOn]} onPress={() => setTab('sent')}>
            <Text style={[styles.tabText, tab === 'sent' && styles.tabTextOn]}>보낸 사진</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'saved' && styles.tabOn]} onPress={() => setTab('saved')}>
            <Text style={[styles.tabText, tab === 'saved' && styles.tabTextOn]}>저장한 사진</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {tab === 'sent' ? '아직 보낸 사진이 없어요' : '아직 저장한 사진이 없어요'}
            </Text>
          </View>
        ) : tab === 'sent' ? (
          <FlatList
            data={sentPhotos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <SentCard
                item={item}
                onDelete={() => confirmDelete(item.photoId, item.peerName)}
                onResolve={(approve) => handleResolveSave(item.photoId, item.targetUserId, approve)}
              />
            )}
          />
        ) : (
          <FlatList
            data={savedPhotos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <SavedCard item={item} />}
          />
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  navTitle: { fontSize: 18, fontFamily: 'SCDream-ExtraBold', color: colors.textHi },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.bgVoid,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  tabOn: { backgroundColor: colors.surfaceHi },
  tabText: { fontSize: 12.5, fontFamily: 'SCDream-Bold', color: colors.textDim },
  tabTextOn: { color: colors.textHi },
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  peer: { fontSize: 13, fontFamily: 'SCDream-Bold', color: colors.textHi },
  time: { fontSize: 10.5, color: colors.textDim },
  deleteBtn: { padding: 2 },
  caption: { fontSize: 12, color: colors.textMid },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  reactionRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  reactionText: { flex: 1, fontSize: 10.5, color: colors.textDim },
  expire: { fontSize: 10, color: colors.textDim, fontFamily: 'SCDream-Medium' },
  badge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 10.5, fontFamily: 'SCDream-Bold' },
  resolveRow: { flexDirection: 'row', gap: 6 },
  rejectBtn: { backgroundColor: colors.surfaceHi, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  rejectBtnText: { fontSize: 10.5, fontFamily: 'SCDream-Bold', color: colors.textMid },
  approveBtn: { backgroundColor: colors.yellow, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  approveBtnText: { fontSize: 10.5, fontFamily: 'SCDream-Bold', color: colors.yellowText },
});
