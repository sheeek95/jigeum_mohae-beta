import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../../src/components/Avatar';
import { ScreenGradient } from '../../src/components/ScreenGradient';
import { Toast } from '../../src/components/Toast';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, radius } from '../../src/theme/tokens';

type PokeTarget = {
  id: string;
  name: string;
  gradient: readonly [string, string];
  dnd: boolean;
  statusText: string;
};

export default function PokeScreen() {
  const friends = useAppStore((s) => s.friends);
  const allGroups = useAppStore((s) => s.groups);
  const pokedIds = useAppStore((s) => s.pokedIds);
  const poke = useAppStore((s) => s.poke);

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const targets: PokeTarget[] = useMemo(
    () => [
      ...friends.map((f) => ({ id: f.id, name: f.name, gradient: f.avatarGradient, dnd: f.dnd, statusText: f.statusText })),
      ...allGroups
        .filter((g) => g.kind === 'group')
        .map((g) => ({
          id: g.id,
          name: g.name,
          gradient: ['#6B7FC7', '#3A2761'] as const,
          dnd: false,
          statusText: `그룹 · ${g.memberCount}명`,
        })),
    ],
    [friends, allGroups]
  );

  function handlePoke(target: PokeTarget) {
    poke(target.id);
    setToastMsg(
      target.dnd ? `${target.name}은(는) 방해금지 중이에요 · 알림이 지연돼요` : `${target.name}에게 '지금 뭐해?'를 보냈어요`
    );
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  }

  return (
    <ScreenGradient glow="coral">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>찌르기</Text>
          <Pressable style={styles.navIcon} onPress={() => router.push('/add-friend')}>
            <Ionicons name="add" size={18} color={colors.textMid} />
          </Pressable>
        </View>

        <FlatList
          data={targets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isPoked = pokedIds.includes(item.id);
            return (
              <View style={styles.row}>
                <Avatar gradient={item.gradient} dnd={item.dnd} />
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.status}>{item.statusText}</Text>
                </View>
                <Pressable
                  style={[styles.pokeBtn, isPoked && styles.pokeBtnSent]}
                  onPress={() => handlePoke(item)}
                >
                  <Text style={[styles.pokeBtnText, isPoked && styles.pokeBtnTextSent]}>
                    {isPoked ? '보냈어요 ✓' : '지금 뭐해?'}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />

        <Toast visible={toastVisible} message={toastMsg} variant="coral" />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navTitle: { fontSize: 18, fontWeight: '800', color: colors.textHi },
  navIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: colors.textHi },
  status: { fontSize: 11.5, color: colors.textDim, marginTop: 1 },
  pokeBtn: { backgroundColor: colors.coralDim, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  pokeBtnSent: { backgroundColor: colors.coral },
  pokeBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.coral },
  pokeBtnTextSent: { color: colors.coralText },
});
