import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../src/components/Buttons';
import { ScreenGradient } from '../src/components/ScreenGradient';
import { useAppStore } from '../src/store/useAppStore';
import { colors, radius } from '../src/theme/tokens';

const INVITE_HOST = 'jigeummohae.app/invite';

function extractInviteCode(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  const segments = trimmed.split('/');
  return segments[segments.length - 1];
}

export default function AddFriendScreen() {
  const [tab, setTab] = useState<'send' | 'recv'>('send');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [codeInput, setCodeInput] = useState('');

  const inviteLink = useAppStore((s) => s.inviteLink);
  const refreshInvite = useAppStore((s) => s.refreshInvite);
  const authStatus = useAppStore((s) => s.authStatus);

  useEffect(() => {
    if (authStatus === 'ready' && !inviteLink) refreshInvite();
  }, [authStatus, inviteLink, refreshInvite]);

  const link = inviteLink ? `${INVITE_HOST}/${inviteLink.code}` : null;

  async function copyLink() {
    if (!link) return;
    await Clipboard.setStringAsync(`https://${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function shareLink() {
    if (!link) return;
    try {
      await Share.share({ message: `지금 모해에서 친구 초대를 보냈어요: https://${link}` });
    } catch {
      // user cancelled — no-op
    }
  }

  function openInvite() {
    const code = extractInviteCode(codeInput);
    if (!code) return;
    router.push({ pathname: '/invite/[code]', params: { code } });
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
            <Text style={[styles.tabText, tab === 'recv' && styles.tabTextOn]}>초대 받음</Text>
          </Pressable>
        </View>

        {tab === 'send' ? (
          <View style={styles.body}>
            {!link ? (
              <ActivityIndicator color={colors.coral} style={{ marginTop: 40 }} />
            ) : (
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
            )}
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.linkCard}>
              <Text style={styles.lcLabel}>받은 초대 링크나 코드를 붙여넣으세요</Text>
              <View style={[styles.linkBox, { marginTop: 10 }]}>
                <TextInput
                  value={codeInput}
                  onChangeText={setCodeInput}
                  placeholder="jigeummohae.app/invite/8f3k2a91"
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <PrimaryButton onPress={openInvite} disabled={!codeInput.trim()} style={{ marginTop: 12 }}>
                초대 확인하기
              </PrimaryButton>
              <Text style={styles.linkNote}>
                카카오톡이나 메시지로 받은 초대 링크를 탭하면 이 화면 없이 바로 열려요. 텍스트로만 전달받았을 때
                여기에 붙여넣어주세요.
              </Text>
            </View>
          </View>
        )}
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
  input: { flex: 1, fontSize: 12, color: colors.textHi, padding: 0 },
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
});
