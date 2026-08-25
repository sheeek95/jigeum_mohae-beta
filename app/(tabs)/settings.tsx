import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../../src/components/Avatar';
import { PromptModal } from '../../src/components/PromptModal';
import { ScreenGradient } from '../../src/components/ScreenGradient';
import { SectionLabel } from '../../src/components/SectionLabel';
import { SwitchToggle } from '../../src/components/SwitchToggle';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, radius } from '../../src/theme/tokens';

const MAX_GROUPS = 3;
const MAX_FRIENDS = 20;

export default function SettingsScreen() {
  const me = useAppStore((s) => s.me);
  const friends = useAppStore((s) => s.friends);
  const allGroups = useAppStore((s) => s.groups);
  const groups = useMemo(() => allGroups.filter((g) => g.kind === 'group'), [allGroups]);
  const dnd = useAppStore((s) => s.dnd);
  const setDnd = useAppStore((s) => s.setDnd);
  const addGroup = useAppStore((s) => s.addGroup);
  const updateDisplayName = useAppStore((s) => s.updateDisplayName);
  const refreshGroups = useAppStore((s) => s.refreshGroups);
  const refreshFriends = useAppStore((s) => s.refreshFriends);
  const authStatus = useAppStore((s) => s.authStatus);
  const authError = useAppStore((s) => s.authError);
  const apiUrl = useAppStore((s) => s.apiUrl);
  const changeApiUrl = useAppStore((s) => s.changeApiUrl);

  const [groupModal, setGroupModal] = useState(false);
  const [nameModal, setNameModal] = useState(false);
  const [serverModal, setServerModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (authStatus === 'ready') {
        refreshGroups();
        refreshFriends();
      }
    }, [authStatus, refreshGroups, refreshFriends])
  );

  async function handleCreateGroup(name: string) {
    try {
      await addGroup(name);
    } catch (err) {
      Alert.alert('그룹을 만들지 못했어요', err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <ScreenGradient glow="coral">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.nav}>
            <Text style={styles.navTitle}>설정</Text>
          </View>

          {me && (
            <Pressable style={styles.profileRow} onPress={() => setNameModal(true)}>
              <Avatar gradient={me.avatarGradient} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.t1}>{me.displayName}</Text>
                <Text style={styles.t2}>탭해서 이름 바꾸기</Text>
              </View>
            </Pressable>
          )}

          <SectionLabel style={styles.sectionLabel}>친구 관리</SectionLabel>
          <View style={styles.block}>
            {friends.map((f) => (
              <View key={f.id} style={styles.row}>
                <View style={styles.personRow}>
                  <Avatar gradient={f.avatarGradient} size={30} dnd={f.dnd} />
                  <Text style={styles.t1}>{f.name}</Text>
                </View>
                <Text style={styles.t2}>{f.statusText}</Text>
              </View>
            ))}
            {friends.length < MAX_FRIENDS ? (
              <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => router.push('/add-friend')}>
                <Text style={styles.t1}>+ 친구 추가</Text>
              </Pressable>
            ) : (
              <Text style={[styles.infoLine, { paddingVertical: 14 }]}>친구는 최대 {MAX_FRIENDS}명까지 추가할 수 있어요</Text>
            )}
          </View>

          <SectionLabel style={styles.sectionLabel}>그룹 관리</SectionLabel>
          <View style={styles.block}>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                style={styles.row}
                onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
              >
                <View>
                  <Text style={styles.t1}>{g.name}</Text>
                  <Text style={styles.t2}>{g.subLabel}</Text>
                </View>
                <Text style={styles.manage}>관리 ›</Text>
              </Pressable>
            ))}
            {groups.length < MAX_GROUPS ? (
              <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => setGroupModal(true)}>
                <Text style={styles.t1}>+ 새 그룹 만들기</Text>
              </Pressable>
            ) : (
              <Text style={[styles.infoLine, { paddingVertical: 14 }]}>그룹은 최대 {MAX_GROUPS}개까지 만들 수 있어요</Text>
            )}
          </View>

          <SectionLabel style={styles.sectionLabel}>방해금지</SectionLabel>
          <View style={styles.block}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.t1}>방해금지 모드</Text>
                <Text style={styles.t2}>켜두면 친구에게도 표시돼요</Text>
              </View>
              <SwitchToggle on={dnd.enabled} onToggle={() => setDnd({ enabled: !dnd.enabled })} />
            </View>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.t1}>시간 자동 설정</Text>
                <Text style={styles.t2}>매일 {dnd.scheduleStart} – {dnd.scheduleEnd}</Text>
              </View>
              <SwitchToggle on={dnd.scheduleEnabled} onToggle={() => setDnd({ scheduleEnabled: !dnd.scheduleEnabled })} />
            </View>
          </View>

          <SectionLabel style={styles.sectionLabel}>사진 보관</SectionLabel>
          <View style={styles.block}>
            <Text style={styles.infoLine}>
              받은 사진은 24시간 뒤 자동 삭제돼요. 저장 요청을 보내고 상대가 허용하면 양쪽 앨범에 남길 수 있어요.
            </Text>
          </View>

          <SectionLabel style={styles.sectionLabel}>개발자 설정</SectionLabel>
          <View style={styles.block}>
            <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => setServerModal(true)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.t1}>서버 주소</Text>
                <Text style={styles.t2} numberOfLines={1}>
                  {apiUrl} · {authStatus === 'ready' ? '연결됨' : authStatus === 'error' ? `연결 실패${authError ? ` (${authError})` : ''}` : '연결 중…'}
                </Text>
              </View>
              <Text style={styles.manage}>변경 ›</Text>
            </Pressable>
          </View>
        </ScrollView>

        <PromptModal
          visible={groupModal}
          title="새 그룹 이름"
          placeholder="예: 우리끼리"
          onCancel={() => setGroupModal(false)}
          onConfirm={(name) => {
            setGroupModal(false);
            handleCreateGroup(name);
          }}
        />
        <PromptModal
          visible={nameModal}
          title="내 이름"
          initialValue={me?.displayName}
          onCancel={() => setNameModal(false)}
          onConfirm={(name) => {
            setNameModal(false);
            updateDisplayName(name);
          }}
        />
        <PromptModal
          visible={serverModal}
          title="서버 주소"
          placeholder="https://jigeum-mohae-api.onrender.com"
          initialValue={apiUrl}
          confirmLabel="연결"
          onCancel={() => setServerModal(false)}
          onConfirm={(url) => {
            setServerModal(false);
            changeApiUrl(url);
          }}
        />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  navTitle: { fontSize: 18, fontWeight: '800', color: colors.textHi },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 13,
  },
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  t1: { fontSize: 13, fontWeight: '700', color: colors.textHi },
  t2: { fontSize: 10.5, color: colors.textDim, marginTop: 2 },
  manage: { fontSize: 11, color: colors.textDim },
  infoLine: { fontSize: 10.5, color: colors.textDim, lineHeight: 17, padding: 15 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
