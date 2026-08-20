import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PulseRing } from '../../src/components/PulseRing';
import { ScreenGradient } from '../../src/components/ScreenGradient';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, radius } from '../../src/theme/tokens';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export default function HomeScreen() {
  const now = useClock();
  const widgetMode = useAppStore((s) => s.widgetMode);
  const widgetPhoto = useAppStore((s) => s.widgetPhoto);
  const toggleWidgetMode = useAppStore((s) => s.toggleWidgetMode);

  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const dateLabel = `${WEEKDAYS[now.getDay()]} ${now.getMonth() + 1}월 ${now.getDate()}일`;

  return (
    <ScreenGradient glow="yellow">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.body}>
          <View style={styles.timeHero}>
            <Text style={styles.time}>{hh}:{mm}</Text>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>

          <View style={styles.widget}>
            <View style={styles.widgetTop}>
              <View style={styles.widgetTitleRow}>
                <View style={styles.badgeDot} />
                <Text style={styles.widgetTitle}>지금 모해 · 우리끼리</Text>
              </View>
              <Pressable onPress={toggleWidgetMode} style={styles.widgetToggle}>
                <Text style={styles.widgetToggleText}>상태 전환</Text>
              </Pressable>
            </View>

            {widgetMode === 'waiting' ? (
              <Pressable style={styles.waitingBox} onPress={() => router.push('/camera')}>
                <PulseRing size={54} />
                <Text style={styles.waitingTxt}>기다리는 중...</Text>
                <Text style={styles.waitingSub}>탭하면 바로 촬영 · 민지가 찔렀어요</Text>
              </Pressable>
            ) : (
              <LinearGradient colors={widgetPhoto.gradient} style={styles.photoBox}>
                <Text style={styles.photoCap}>
                  {widgetPhoto.senderName} · {widgetPhoto.timeLabel}
                </Text>
                <Text style={styles.photoCapSmall}>&ldquo;{widgetPhoto.caption}&rdquo;</Text>
              </LinearGradient>
            )}
          </View>

          <View style={styles.iconRow}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.appIcon} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 },
  timeHero: { alignItems: 'center', marginVertical: 18 },
  time: { fontSize: 48, fontWeight: '700', color: colors.textHi, letterSpacing: -1 },
  date: { fontSize: 13, color: colors.textMid, marginTop: 2 },
  widget: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    minHeight: 220,
  },
  widgetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  widgetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.coral },
  widgetTitle: { fontSize: 12.5, fontWeight: '700', color: colors.textMid },
  widgetToggle: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgVoid,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  widgetToggleText: { fontSize: 11, color: colors.textDim },
  waitingBox: {
    flex: 1,
    minHeight: 170,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,214,102,0.45)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,214,102,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  waitingTxt: { fontSize: 13, fontWeight: '700', color: colors.yellow },
  waitingSub: { fontSize: 10.5, color: colors.textDim },
  photoBox: { flex: 1, minHeight: 170, borderRadius: 18, justifyContent: 'flex-end', padding: 12 },
  photoCap: { fontSize: 12, fontWeight: '600', color: '#fff' },
  photoCapSmall: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  iconRow: { flexDirection: 'row', gap: 14, marginTop: 18, justifyContent: 'center' },
  appIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surfaceHi, opacity: 0.5 },
});
