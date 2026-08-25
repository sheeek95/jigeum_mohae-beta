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

function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  const withoutQuery = trimmed.split('?')[0].replace(/\/+$/, '');
  const segments = withoutQuery.split('/');
  return segments[segments.length - 1];
}

export default function AddFriendScreen() {
  const [tab, setTab] = useState<'send' | 'recv'>('send');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');

  const inviteLink = useAppStore((s) => s.inviteLink);
  const refreshInvite = useAppStore((s) => s.refreshInvite);
  const authStatus = useAppStore((s) => s.authStatus);
  const apiUrl = useAppStore((s) => s.apiUrl);

  useEffect(() => {
    if (authStatus === 'ready' && !inviteLink) refreshInvite();
  }, [authStatus, inviteLink, refreshInvite]);

  const code = inviteLink?.code ?? null;
  // Short, our-own-domain redirect to the (long, can't-be-shortened-at-the-
  // source) beta APK download page — see the /i/:code route in app.ts.
  const installLink = code ? `${apiUrl}/i/${code}` : null;

  async function copyLink() {
    if (!installLink) return;
    await Clipboard.setStringAsync(installLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1600);
  }

  async function copyCode() {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1600);
  }

  async function shareLink() {
    if (!installLink || !code) return;
    try {
      await Share.share({
        message: `지금 모해에서 친구 초대를 보냈어요!\n\n앱 설치: ${installLink}\n\n설치 후 앱에서 "친구 등록 → 초대 받음"에 이 코드를 입력해주세요: ${code}`,
      });
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
            <Text style={[styles.tabText, tab === 'send' && styles.tabTextOn]}>친구 초대</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'recv' && styles.tabOn]} onPress={() => setTab('recv')}>
            <Text style={[styles.tabText, tab === 'recv' && styles.tabTextOn]}>초대 받음</Text>
          </Pressable>
        </View>

        {tab === 'send' ? (
          <View style={styles.body}>
            {!installLink || !code ? (
              <ActivityIndicator color={colors.coral} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.linkCard}>
                <Text style={styles.lcLabel}>앱 설치 링크</Text>
                <View style={[styles.linkBox, { marginTop: 10 }]}>
                  <Text style={styles.linkText} numberOfLines={1}>{installLink}</Text>
                  <Pressable style={[styles.copyBtn, copiedLink && styles.copyBtnDone]} onPress={copyLink}>
                    <Text style={styles.copyBtnText}>{copiedLink ? '복사됨 ✓' : '복사'}</Text>
                  </Pressable>
                </View>

                <Text style={[styles.lcLabel, { marginTop: 14, marginBottom: 8 }]}>초대 코드</Text>
                <View style={styles.linkBox}>
                  <Text style={styles.linkText} numberOfLines={1}>{code}</Text>
                  <Pressable style={[styles.copyBtn, copiedCode && styles.copyBtnDone]} onPress={copyCode}>
                    <Text style={styles.copyBtnText}>{copiedCode ? '복사됨 ✓' : '복사'}</Text>
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
                </View>

                <Text style={styles.linkNote}>
                  친구가 링크로 앱을 설치한 뒤, 앱에서 "친구 등록 → 초대 받음"에 위 코드를 입력하면 친구 요청이
                  가요. 수락하기 전까지는 서로의 위젯이 보이지 않아요. 이 코드는 계속 유효해서 여러 친구에게
                  재사용할 수 있어요.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.linkCard}>
              <Text style={styles.lcLabel}>받은 초대 코드를 입력하세요</Text>
              <View style={[styles.linkBox, { marginTop: 10 }]}>
                <TextInput
                  value={codeInput}
                  onChangeText={setCodeInput}
                  placeholder="초대코드를 입력해주세요"
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <PrimaryButton onPress={openInvite} disabled={!codeInput.trim()} style={{ marginTop: 12 }}>
                초대 코드 등록
              </PrimaryButton>
              <Text style={styles.linkNote}>
                친구가 카카오톡이나 메시지로 보낸 코드를 여기에 붙여넣으면 친구 요청을 보낼 수 있어요.
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
  lcLabel: { fontSize: 12, fontWeight: '700', color: colors.textMid },
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
  linkNote: { fontSize: 10.5, color: colors.textDim, lineHeight: 17, marginTop: 12 },
});
