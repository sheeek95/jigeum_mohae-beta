import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenGradient } from '../src/components/ScreenGradient';
import { useAppStore } from '../src/store/useAppStore';
import type { AppNotification, NotificationType } from '../src/store/types';
import { colors, radius } from '../src/theme/tokens';
import { formatRelative } from '../src/utils/time';

const TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  'friend-added': 'person-add-outline',
  poke: 'hand-left-outline',
  'photo-received': 'image-outline',
  'photo-reaction': 'chatbubble-ellipses-outline',
  'photo-reply': 'arrow-undo-outline',
  'save-request': 'download-outline',
};

function navigateFor(item: AppNotification) {
  switch (item.type) {
    case 'poke':
      router.push('/(tabs)/poke');
      return;
    // A brand-new photo only ever lives in the group's story viewer (not
    // saved into the album yet) — send the user to Home to tap into it.
    case 'photo-received':
    case 'friend-added':
      router.push('/(tabs)');
      return;
    case 'photo-reaction':
    case 'photo-reply':
    case 'save-request':
      router.push('/(tabs)/album');
      return;
  }
}

export default function NotificationsScreen() {
  const notifications = useAppStore((s) => s.notifications);
  const refreshNotifications = useAppStore((s) => s.refreshNotifications);
  const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);
  const authStatus = useAppStore((s) => s.authStatus);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (authStatus !== 'ready') return;
    setLoadError(null);
    refreshNotifications()
      .then(() => markNotificationsRead())
      .catch((err) => setLoadError(err instanceof Error ? err.message : '알림을 불러오지 못했어요'))
      .finally(() => setLoading(false));
  }, [authStatus, refreshNotifications, markNotificationsRead]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  return (
    <ScreenGradient glow="yellow">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>알림함</Text>
          <Pressable style={styles.navIcon} onPress={() => router.back()}>
            <Ionicons name="close" size={18} color={colors.textMid} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.yellow} style={{ marginTop: 40 }} />
        ) : loadError ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 도착한 알림이 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => navigateFor(item)}>
                <View style={styles.icon}>
                  <Ionicons name={TYPE_ICON[item.type]} size={16} color={colors.yellow} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
              </Pressable>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textDim, fontSize: 13 },
  errorWrap: { alignItems: 'center', marginTop: 40, gap: 12, paddingHorizontal: 20 },
  errorText: { fontSize: 12.5, color: colors.textMid, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.surfaceHi, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  retryBtnText: { fontSize: 12.5, fontFamily: 'SCDream-Bold', color: colors.textHi },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  icon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontFamily: 'SCDream-Bold', color: colors.textHi },
  body: { fontSize: 11.5, color: colors.textMid, lineHeight: 16 },
  time: { fontSize: 10, color: colors.textDim, marginTop: 2 },
});
