import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenGradient } from '../../src/components/ScreenGradient';
import { SectionLabel } from '../../src/components/SectionLabel';
import { SwitchToggle } from '../../src/components/SwitchToggle';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, radius } from '../../src/theme/tokens';

export default function SettingsScreen() {
  const allGroups = useAppStore((s) => s.groups);
  const groups = useMemo(() => allGroups.filter((g) => g.kind === 'group'), [allGroups]);
  const dnd = useAppStore((s) => s.dnd);
  const toggleDnd = useAppStore((s) => s.toggleDnd);
  const addGroup = useAppStore((s) => s.addGroup);

  return (
    <ScreenGradient glow="coral">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.nav}>
            <Text style={styles.navTitle}>설정</Text>
          </View>

          <SectionLabel style={styles.sectionLabel}>그룹 관리</SectionLabel>
          <View style={styles.block}>
            {groups.map((g) => (
              <View key={g.id} style={styles.row}>
                <View>
                  <Text style={styles.t1}>{g.name}</Text>
                  <Text style={styles.t2}>{g.subLabel}</Text>
                </View>
                <Text style={styles.manage}>관리 ›</Text>
              </View>
            ))}
            <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => addGroup(`새 그룹 ${groups.length + 1}`)}>
              <Text style={styles.t1}>+ 새 그룹 만들기</Text>
            </Pressable>
          </View>

          <SectionLabel style={styles.sectionLabel}>방해금지</SectionLabel>
          <View style={styles.block}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.t1}>방해금지 모드</Text>
                <Text style={styles.t2}>켜두면 친구에게도 표시돼요</Text>
              </View>
              <SwitchToggle on={dnd.enabled} onToggle={toggleDnd} />
            </View>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.t1}>시간 자동 설정</Text>
                <Text style={styles.t2}>{dnd.scheduleLabel}</Text>
              </View>
              <Text style={styles.manage}>변경 ›</Text>
            </View>
          </View>

          <SectionLabel style={styles.sectionLabel}>사진 보관</SectionLabel>
          <View style={styles.block}>
            <Text style={styles.infoLine}>
              받은 사진은 24시간 뒤 자동 삭제돼요. 저장 요청을 보내고 상대가 허용하면 양쪽 앨범에 남길 수 있어요.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  navTitle: { fontSize: 18, fontWeight: '800', color: colors.textHi },
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
});
