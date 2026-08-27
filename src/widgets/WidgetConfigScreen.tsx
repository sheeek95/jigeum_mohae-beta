import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';

import { colors, radius } from '../theme/tokens';
import { JigeumMohaeWidget } from './JigeumMohaeWidget';
import { fetchCrossGroupLatestPhoto, fetchGroupLatestPhoto, fetchMyGroups, setWidgetTarget, type WidgetTarget } from './widgetTargets';

// Shown when a widget is first placed, and again whenever the user
// long-presses it → "위젯 설정" (app.json declares widgetFeatures:
// "reconfigurable") — picks which group/friend THIS widget instance shows.
// Runs as its own mounted screen (not the headless task handler), but still
// can't assume the app's zustand store is live in this process, so it goes
// through the same self-sufficient fetchers as the task handler.
export function WidgetConfigScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const [groups, setGroups] = useState<WidgetTarget[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMyGroups().then(setGroups);
  }, []);

  async function choose(target: WidgetTarget | null) {
    setSaving(true);
    await setWidgetTarget(widgetInfo.widgetId, target ? { groupId: target.id, name: target.name } : null);
    const photo = target ? await fetchGroupLatestPhoto(target.id) : await fetchCrossGroupLatestPhoto();
    renderWidget(<JigeumMohaeWidget photo={photo} targetLabel={target?.name ?? null} />);
    setResult('ok');
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>위젯에 표시할 대상</Text>
      <Text style={styles.subtitle}>이 위젯에서 보여줄 그룹이나 친구를 골라주세요.</Text>

      {groups === null ? (
        <ActivityIndicator color={colors.yellow} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          style={{ marginTop: 12 }}
          data={groups}
          keyExtractor={(g) => g.id}
          ListHeaderComponent={
            <Pressable style={styles.row} onPress={() => choose(null)} disabled={saving}>
              <Text style={styles.rowText}>전체 (가장 최근 사진)</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => choose(item)} disabled={saving}>
              <Text style={styles.rowText}>{item.name}</Text>
              <Text style={styles.rowKind}>{item.kind === 'GROUP' ? '그룹' : '친구'}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>아직 그룹이나 친구가 없어요.</Text>}
        />
      )}

      {saving && <ActivityIndicator color={colors.yellow} style={styles.savingOverlay} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgVoid, paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 18, fontFamily: 'SCDream-ExtraBold', color: colors.textHi },
  subtitle: { fontSize: 12.5, color: colors.textMid, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  rowText: { fontSize: 14, fontFamily: 'SCDream-Bold', color: colors.textHi },
  rowKind: { fontSize: 11, color: colors.textDim },
  emptyText: { fontSize: 12.5, color: colors.textDim, marginTop: 16 },
  savingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
