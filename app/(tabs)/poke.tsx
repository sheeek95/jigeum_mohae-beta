import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../../src/components/Avatar';
import { ScreenGradient } from '../../src/components/ScreenGradient';
import { Toast } from '../../src/components/Toast';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, radius } from '../../src/theme/tokens';

export default function PokeScreen() {
  const friends = useAppStore((s) => s.friends);
  const pokedIds = useAppStore((s) => s.pokedIds);
  const poke = useAppStore((s) => s.poke);
  const refreshFriends = useAppStore((s) => s.refreshFriends);
  const authStatus = useAppStore((s) => s.authStatus);

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (authStatus !== 'ready') return;
      refreshFriends();
    }, [authStatus, refreshFriends])
  );

  async function handlePoke(friend: (typeof friends)[number]) {
    try {
      const delayed = await poke(friend.id);
      setToastMsg(delayed ? `${friend.name}은(는) 방해금지 중이에요 · 알림이 지연돼요` : `${friend.name}에게 '지금 뭐해?'를 보냈어요`);
    } catch {
      setToastMsg('찌르기에 실패했어요. 다시 시도해주세요');
    }
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
          data={friends}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>아직 친구가 없어요{'\n'}오른쪽 위 + 버튼으로 초대해보세요</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPoked = pokedIds.includes(item.id);
            return (
              <View style={styles.row}>
                <Avatar gradient={item.avatarGradient} dnd={item.dnd} />
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
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: colors.textDim, fontSize: 13, textAlign: 'center', lineHeight: 20 },
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
