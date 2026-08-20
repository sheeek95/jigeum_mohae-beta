import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../src/components/Avatar';
import { CoralButton, GhostButton } from '../src/components/Buttons';
import { Checkbox } from '../src/components/Checkbox';
import { ScreenGradient } from '../src/components/ScreenGradient';
import { SectionLabel } from '../src/components/SectionLabel';
import { Toast } from '../src/components/Toast';
import { useAppStore } from '../src/store/useAppStore';
import { colors, radius } from '../src/theme/tokens';

const INVITE_HOST = 'jigeummohae.app/invite';

export default function AddFriendScreen() {
  const [tab, setTab] = useState<'send' | 'recv'>('send');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const inviteLink = useAppStore((s) => s.inviteLink);
  const incomingInvites = useAppStore((s) => s.incomingInvites);
  const allGroups = useAppStore((s) => s.groups);
  const groups = useMemo(() => allGroups.filter((g) => g.kind === 'group'), [allGroups]);
  const acceptInvite = useAppStore((s) => s.acceptInvite);
  const declineInvite = useAppStore((s) => s.declineInvite);

  const link = `${INVITE_HOST}/${inviteLink.code}`;

  function showToast(msg: string) {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  }

  async function copyLink() {
    await Clipboard.setStringAsync(`https://${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function shareLink() {
    try {
      await Share.share({ message: `지금 모해에서 친구 초대를 보냈어요: https://${link}` });
    } catch {
      // user cancelled — no-op
    }
  }

  function accept(id: string, name: string) {
    acceptInvite(id);
    showToast(`${name}님을 친구로 등록했어요 ✓`);
  }

  function decline(id: string) {
    declineInvite(id);
    showToast('초대를 거절했어요');
  }

  return (
    <ScreenGradient glow="coral">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>친구 등록</Text>
          <Pressable style={styles.navIcon} onPress={() => router.back()}>
            <Ionicons name="close" size={18} color={colors.textMid} />
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, tab === 'send' && styles.tabOn]} onPress={() => setTab('send')}>
            <Text style={[styles.tabText, tab === 'send' && styles.tabTextOn]}>링크 만들기</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'recv' && styles.tabOn]} onPress={() => setTab('recv')}>
            <Text style={[styles.tabText, tab === 'recv' && styles.tabTextOn]}>
              초대 받음{incomingInvites.length > 0 ? ` (${incomingInvites.length})` : ''}
            </Text>
          </Pressable>
        </View>

        {tab === 'send' ? (
          <View style={styles.body}>
            <View style={styles.linkCard}>
              <View style={styles.lcTop}>
                <Text style={styles.lcLabel}>내 초대 링크</Text>
                <View style={styles.lcExpire}>
                  <Text style={styles.lcExpireText}>7일간 유효</Text>
                </View>
              </View>
              <View style={styles.linkBox}>
                <Text style={styles.linkText} numberOfLines={1}>{link}</Text>
                <Pressable style={[styles.copyBtn, copied && styles.copyBtnDone]} onPress={copyLink}>
                  <Text style={styles.copyBtnText}>{copied ? '복사됨 ✓' : '복사'}</Text>
                </Pressable>
              </View>

              <View style={styles.shareRow}>
                <Pressable style={styles.shareBtn} onPress={shareLink}>
                  <View style={[styles.shareIc, { backgroundColor: colors.yellow }]}>
                    <Text style={{ fontWeight: '800', color: colors.yellowText }}>K</Text>
                  </View>
                  <Text style={styles.shareBtnText}>카카오톡</Text>
                </Pressable>
                <Pressable style={styles.shareBtn} onPress={shareLink}>
                  <View style={styles.shareIc}>
                    <Ionicons name="mail-outline" size={16} color={colors.textHi} />
                  </View>
                  <Text style={styles.shareBtnText}>메시지</Text>
                </Pressable>
                <Pressable style={styles.shareBtn} onPress={() => setShowQr((v) => !v)}>
                  <View style={styles.shareIc}>
                    <Ionicons name="qr-code-outline" size={16} color={colors.textHi} />
                  </View>
                  <Text style={styles.shareBtnText}>QR코드</Text>
                </Pressable>
              </View>

              {showQr && (
                <View style={styles.qrBox}>
                  <Ionicons name="qr-code" size={64} color={colors.textMid} />
                  <Text style={styles.qrHint}>친구가 이 화면을 스캔하면 초대가 열려요</Text>
                </View>
              )}

              <Text style={styles.linkNote}>
                이 링크로 들어온 사람은 자동으로 친구 요청을 보내요. 수락하기 전까지는 서로의 위젯이 보이지
                않아요. 링크는 최대 7일간, 1명만 사용할 수 있어요.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.body}>
            {incomingInvites.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>받은 초대가 없어요</Text>
              </View>
            ) : (
              incomingInvites.map((invite) => (
                <View key={invite.id} style={styles.incomingCard}>
                  <Avatar gradient={['#FF9AA6', '#8A6BC7']} size={56} />
                  <Text style={styles.incomingTitle}>{invite.name}님이 초대 링크로 들어왔어요</Text>
                  <Text style={styles.incomingSub}>수락하면 서로의 위젯에 사진을 공유할 수 있어요</Text>

                  <View style={styles.incomingGroup}>
                    <SectionLabel style={{ marginBottom: 6 }}>추가할 그룹 선택</SectionLabel>
                    {groups.map((g) => {
                      const on = (selectedGroup ?? invite.suggestedGroupId) === g.id;
                      return (
                        <Pressable
                          key={g.id}
                          style={styles.groupRow}
                          onPress={() => setSelectedGroup(g.id)}
                        >
                          <Checkbox on={on} />
                          <View>
                            <Text style={styles.gName}>{g.name}</Text>
                            <Text style={styles.gSub}>친구 {g.memberCount}명</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.incomingActions}>
                    <GhostButton onPress={() => decline(invite.id)}>거절</GhostButton>
                    <CoralButton onPress={() => accept(invite.id, invite.name)}>친구 수락</CoralButton>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <Toast visible={toastVisible} message={toastMsg} variant="yellow" />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navTitle: { fontSize: 16, fontWeight: '800', color: colors.textHi },
  navIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 14, backgroundColor: colors.bgVoid, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.line },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  tabOn: { backgroundColor: colors.surfaceHi },
  tabText: { fontSize: 12.5, fontWeight: '700', color: colors.textDim },
  tabTextOn: { color: colors.textHi },
  body: { flex: 1, paddingHorizontal: 16 },
  linkCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, padding: 16 },
  lcTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  lcLabel: { fontSize: 12, fontWeight: '700', color: colors.textMid },
  lcExpire: { backgroundColor: 'rgba(255,214,102,0.12)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  lcExpireText: { fontSize: 10, fontWeight: '700', color: colors.yellow },
  linkBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgVoid, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 11 },
  linkText: { flex: 1, fontSize: 12, color: colors.textMid },
  copyBtn: { backgroundColor: colors.yellow, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  copyBtnDone: { backgroundColor: colors.surfaceHi },
  copyBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.yellowText },
  shareRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
  shareBtn: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: colors.bgVoid, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 12 },
  shareIc: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  shareBtnText: { fontSize: 11, color: colors.textMid, fontWeight: '600' },
  qrBox: { alignItems: 'center', gap: 8, marginTop: 14, paddingVertical: 16, backgroundColor: colors.bgVoid, borderRadius: 14 },
  qrHint: { fontSize: 10.5, color: colors.textDim },
  linkNote: { fontSize: 10.5, color: colors.textDim, lineHeight: 17, marginTop: 12 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textDim, fontSize: 13 },
  incomingCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, padding: 18, alignItems: 'center' },
  incomingTitle: { fontSize: 14, fontWeight: '800', color: colors.textHi, marginTop: 12, textAlign: 'center' },
  incomingSub: { fontSize: 11.5, color: colors.textDim, marginTop: 4, textAlign: 'center' },
  incomingGroup: { alignSelf: 'stretch', marginTop: 16 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgVoid, borderRadius: 16, padding: 11, borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
  gName: { fontSize: 13, fontWeight: '700', color: colors.textHi },
  gSub: { fontSize: 10.5, color: colors.textDim },
  incomingActions: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
});
