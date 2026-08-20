import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../src/components/Buttons';
import { PulseRing } from '../src/components/PulseRing';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/tokens';

const SLIDES = [
  {
    eyebrow: 'WELCOME',
    headline: '지금, 뭐 해?',
    sub: '위젯 하나로 친구·연인·가족의 지금을\n가볍게 확인하고 나눠보세요.',
    illustration: 'logo' as const,
  },
  {
    eyebrow: 'WIDGET',
    headline: '앱을 열지 않아도,\n홈 화면에서 바로',
    sub: "위젯이 '기다리는 중...'일 땐 탭 한 번으로\n바로 촬영하고 공유할 수 있어요.",
    illustration: 'widget' as const,
  },
  {
    eyebrow: 'POKE',
    headline: '궁금하면,\n찔러보세요',
    sub: "버튼 하나로 상대에게 '지금 뭐해?'를 보내요.\n방해금지 중이면 서로에게 표시돼요.",
    illustration: 'poke' as const,
  },
  {
    eyebrow: 'PRIVACY',
    headline: '사진은 24시간 후\n자동으로 사라져요',
    sub: '계속 남기고 싶다면 저장을 요청할 수 있어요.\n상대가 동의해야 양쪽 앨범에 저장돼요.',
    illustration: 'clock' as const,
  },
];

function Illustration({ kind }: { kind: (typeof SLIDES)[number]['illustration'] }) {
  if (kind === 'logo') {
    return (
      <LinearGradient colors={['#FF6F81', '#6B3D8C']} style={styles.logo}>
        <Text style={styles.logoText}>모</Text>
      </LinearGradient>
    );
  }
  if (kind === 'widget') {
    return (
      <View style={styles.widgetDemo}>
        <PulseRing size={54} />
      </View>
    );
  }
  if (kind === 'poke') {
    return (
      <View style={styles.pokeDemo}>
        <View style={styles.pokeBubble}>
          <Text style={styles.pokeBubbleText}>지금 뭐해?</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.clockDemo}>
      <Text style={styles.clockText}>24H</Text>
    </View>
  );
}

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [slide, setSlide] = useState(0);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  function finish() {
    completeOnboarding();
    router.replace('/(tabs)');
  }

  function goTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setSlide(index);
  }

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setSlide(index);
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#241A47', '#170F2C', '#0F0A1F']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.skipRow}>
          <Pressable onPress={finish} hitSlop={10}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
        >
          {SLIDES.map((s, i) => (
            <View key={i} style={{ width, paddingHorizontal: 24 }}>
              <View style={styles.illustrationWrap}>
                <Illustration kind={s.illustration} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.eyebrow}>{s.eyebrow}</Text>
                <Text style={styles.headline}>{s.headline}</Text>
                <Text style={styles.sub}>{s.sub}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === slide && styles.dotOn]} />
          ))}
        </View>

        <View style={styles.btnRow}>
          <PrimaryButton onPress={() => (slide === SLIDES.length - 1 ? finish() : goTo(slide + 1))}>
            {slide === SLIDES.length - 1 ? '시작하기' : '다음'}
          </PrimaryButton>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgVoid },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
  skipText: { fontSize: 13, color: colors.textDim, fontWeight: '700', padding: 6 },
  illustrationWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  logo: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  widgetDemo: {
    width: 170,
    height: 170,
    borderRadius: 34,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pokeDemo: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  pokeBubble: {
    backgroundColor: colors.coral,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
  },
  pokeBubbleText: { color: colors.coralText, fontWeight: '800', fontSize: 15 },
  clockDemo: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 6,
    borderColor: colors.surfaceHi,
    borderTopColor: colors.yellow,
    borderRightColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockText: { fontSize: 15, fontWeight: '800', color: colors.yellow },
  copy: { alignItems: 'center', marginBottom: 8 },
  eyebrow: { fontSize: 12, color: colors.coral, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  headline: { fontSize: 24, fontWeight: '800', color: colors.textHi, textAlign: 'center', lineHeight: 32 },
  sub: { fontSize: 13.5, color: colors.textMid, textAlign: 'center', marginTop: 12, lineHeight: 21 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 18 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surfaceHi },
  dotOn: { backgroundColor: colors.yellow, width: 16, borderRadius: 4 },
  btnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingBottom: 20 },
});
