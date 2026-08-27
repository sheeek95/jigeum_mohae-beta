import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppStore } from '../../src/store/useAppStore';
import type { AvatarGradient, Comment, GroupPhoto } from '../../src/store/types';
import { colors, radius } from '../../src/theme/tokens';
import { formatRelative } from '../../src/utils/time';

const SLIDE_MS = 5000;
const TICK_MS = 100;
const TICKER_ROTATE_MS = 2400;
const HOLD_DELAY_MS = 220;

const AVATAR_FALLBACK: AvatarGradient = ['#B7AEDB', '#5B3E86'];
// A fresh `?? []` fallback inside a Zustand selector returns a new array
// reference every render, which the store's Object.is check reads as
// "changed" — that re-triggers the render, which asks for a new empty array
// again, forever. One stable shared reference for the not-yet-loaded case.
const EMPTY_GROUP_PHOTOS: GroupPhoto[] = [];

function initial(name: string) {
  return name.charAt(0) || '?';
}

function InitialAvatar({ name, gradient, size = 28 }: { name: string; gradient: AvatarGradient; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <View
        style={{
          flex: 1,
          backgroundColor: gradient[0],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.4, fontFamily: 'SCDream-ExtraBold', color: 'rgba(0,0,0,0.55)' }}>{initial(name)}</Text>
      </View>
    </View>
  );
}

export default function StoryScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const me = useAppStore((s) => s.me);
  const friends = useAppStore((s) => s.friends);
  const groups = useAppStore((s) => s.groups);
  const fetchGroupPhotos = useAppStore((s) => s.fetchGroupPhotos);
  const groupPhotos = useAppStore((s) => s.groupPhotos[groupId ?? ''] ?? EMPTY_GROUP_PHOTOS);
  const commentThreads = useAppStore((s) => s.commentThreads);
  const fetchComments = useAppStore((s) => s.fetchComments);
  const submitComment = useAppStore((s) => s.submitComment);
  const requestSave = useAppStore((s) => s.requestSave);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [held, setHeld] = useState(false);
  const wasLongPress = useRef(false);

  const [sheetPhoto, setSheetPhoto] = useState<GroupPhoto | null>(null);
  const [replyTarget, setReplyTarget] = useState<{ commentId: string; name: string } | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [sending, setSending] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  const [compactInput, setCompactInput] = useState('');
  const [compactFocused, setCompactFocused] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  const groupFriends = useMemo(() => {
    if (!group) return [];
    if (group.kind === 'group') return group.members ?? [];
    const friend = friends.find((f) => f.id === group.friendId);
    return friend ? [{ id: friend.id, displayName: friend.name }] : [];
  }, [group, friends]);

  function avatarFor(userId: string): AvatarGradient {
    if (me && userId === me.id) return me.avatarGradient;
    return friends.find((f) => f.id === userId)?.avatarGradient ?? AVATAR_FALLBACK;
  }
  function nameFor(userId: string): string {
    if (me && userId === me.id) return '나';
    return friends.find((f) => f.id === userId)?.name ?? '?';
  }

  const load = useCallback(() => {
    if (!groupId) return;
    setLoading(true);
    setLoadError(null);
    fetchGroupPhotos(groupId)
      .catch((err) => setLoadError(err instanceof Error ? err.message : '사진을 불러오지 못했어요'))
      .finally(() => setLoading(false));
  }, [groupId, fetchGroupPhotos]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const photo = groupPhotos[current] ?? null;

  const isPaused = held || compactFocused || !!sheetPhoto;

  // Auto-advance, pausable while held / typing / the reactions sheet is open.
  useEffect(() => {
    if (loading || groupPhotos.length === 0) return;
    const id = setInterval(() => {
      if (isPaused) return;
      setElapsedMs((ms) => {
        const next = ms + TICK_MS;
        if (next >= SLIDE_MS) {
          if (current >= groupPhotos.length - 1) {
            router.back();
            return ms;
          }
          setCurrent((i) => i + 1);
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [loading, groupPhotos.length, isPaused, current]);

  // The one-line ticker preview rotates through top-level comments.
  useEffect(() => {
    setTickerIndex(0);
    if (!photo || photo.comments.length <= 1) return;
    const id = setInterval(() => setTickerIndex((i) => (i + 1) % photo.comments.length), TICKER_ROTATE_MS);
    return () => clearInterval(id);
  }, [photo]);

  function goTo(index: number) {
    if (index < 0) return;
    if (index >= groupPhotos.length) {
      router.back();
      return;
    }
    setCurrent(index);
    setElapsedMs(0);
  }

  function handleZonePress(dir: 'prev' | 'next') {
    if (wasLongPress.current) {
      wasLongPress.current = false;
      return;
    }
    goTo(dir === 'prev' ? current - 1 : current + 1);
  }

  function handleLongPress() {
    wasLongPress.current = true;
    setHeld(true);
  }

  function handlePressOut() {
    if (wasLongPress.current) setHeld(false);
  }

  async function handleSaveRequest() {
    if (!photo) return;
    try {
      await requestSave(photo.photoId);
      await fetchGroupPhotos(groupId ?? '');
    } catch (err) {
      Alert.alert('저장 요청을 보내지 못했어요', err instanceof Error ? err.message : undefined);
    }
  }

  async function handleCompactSubmit() {
    const text = compactInput.trim();
    if (!text || !photo) return;
    try {
      await submitComment(photo.photoId, text);
      await fetchGroupPhotos(groupId ?? '');
      setCompactInput('');
    } catch (err) {
      Alert.alert('반응을 남기지 못했어요', err instanceof Error ? err.message : undefined);
    }
  }

  function openSheet(target: GroupPhoto) {
    setSheetPhoto(target);
    setReplyTarget(null);
    setCommentInput('');
    fetchComments(target.photoId).catch(() => {});
  }

  function closeSheet() {
    setSheetPhoto(null);
    setReplyTarget(null);
    setCommentInput('');
  }

  function startReply(comment: Comment) {
    setReplyTarget({ commentId: comment.id, name: comment.displayName });
    setCommentInput(`@${comment.displayName} `);
    commentInputRef.current?.focus();
  }

  async function handleSheetSubmit() {
    const text = commentInput.trim();
    if (!text || !sheetPhoto || sending) return;
    setSending(true);
    try {
      await submitComment(sheetPhoto.photoId, text, replyTarget?.commentId);
      await Promise.all([fetchComments(sheetPhoto.photoId), fetchGroupPhotos(groupId ?? '')]);
      setCommentInput('');
      setReplyTarget(null);
    } catch (err) {
      Alert.alert('댓글을 보내지 못했어요', err instanceof Error ? err.message : undefined);
    } finally {
      setSending(false);
    }
  }

  const mentionQuery = useMemo(() => {
    const at = commentInput.lastIndexOf('@');
    if (at === -1) return null;
    const after = commentInput.slice(at + 1);
    if (/\s/.test(after)) return null;
    return after;
  }, [commentInput]);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return groupFriends.filter((f) => f.displayName.toLowerCase().startsWith(q));
  }, [mentionQuery, groupFriends]);

  function pickMention(name: string) {
    const at = commentInput.lastIndexOf('@');
    setCommentInput(commentInput.slice(0, at) + '@' + name + ' ');
  }

  const thread = sheetPhoto ? commentThreads[sheetPhoto.photoId] : undefined;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {(loading || loadError) && (
          <Pressable style={styles.floatingCloseBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        )}
        {loading ? (
          <ActivityIndicator color={colors.yellow} style={{ marginTop: 60 }} />
        ) : loadError ? (
          <View style={styles.centerWrap}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : groupPhotos.length === 0 ? (
          <View style={styles.centerWrap}>
            <Text style={styles.errorText}>지금 볼 수 있는 사진이 없어요</Text>
            <Pressable style={styles.retryBtn} onPress={() => router.back()}>
              <Text style={styles.retryBtnText}>닫기</Text>
            </Pressable>
          </View>
        ) : photo ? (
          <>
            <Image source={{ uri: photo.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
              colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']}
              locations={[0, 0.22, 0.58, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <Pressable
              style={[styles.tapzone, { left: 0, width: '32%' }]}
              onPress={() => handleZonePress('prev')}
              onLongPress={handleLongPress}
              onPressOut={handlePressOut}
              delayLongPress={HOLD_DELAY_MS}
            />
            <Pressable
              style={[styles.tapzone, { left: '32%', right: 0 }]}
              onPress={() => handleZonePress('next')}
              onLongPress={handleLongPress}
              onPressOut={handlePressOut}
              delayLongPress={HOLD_DELAY_MS}
            />

            <View style={styles.bars}>
              {groupPhotos.map((_, i) => (
                <Pressable key={i} style={styles.barTrack} onPress={() => goTo(i)}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${i < current ? 100 : i > current ? 0 : (elapsedMs / SLIDE_MS) * 100}%` },
                    ]}
                  />
                </Pressable>
              ))}
            </View>

            <View style={styles.header}>
              <InitialAvatar name={photo.isMine ? '나' : photo.senderName} gradient={avatarFor(photo.senderId)} size={30} />
              <View style={{ flex: 1 }}>
                <Text style={styles.headerName}>{photo.isMine ? '나' : photo.senderName}</Text>
                <Text style={styles.headerTime}>{formatRelative(photo.createdAt)}</Text>
              </View>
              {photo.isMine && (
                <View style={styles.mineTag}>
                  <Text style={styles.mineTagText}>내가 보낸 사진</Text>
                </View>
              )}
              <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={18} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.bottom}>
              <View style={styles.captionRow}>
                {!!photo.caption && (
                  <Text style={styles.captionTxt} numberOfLines={1}>
                    &ldquo;{photo.caption}&rdquo;
                  </Text>
                )}
                {!photo.isMine &&
                  (photo.saveStatus === 'none' || photo.saveStatus === null ? (
                    <Pressable style={styles.savePill} onPress={handleSaveRequest}>
                      <Text style={styles.savePillText}>저장 요청</Text>
                    </Pressable>
                  ) : photo.saveStatus === 'pending' ? (
                    <View style={[styles.savePill, styles.savePillPending]}>
                      <Text style={styles.savePillPendingText}>저장 요청됨</Text>
                    </View>
                  ) : photo.saveStatus === 'approved' ? (
                    <View style={[styles.savePill, styles.savePillPending]}>
                      <Text style={styles.savePillPendingText}>저장됨 ✓</Text>
                    </View>
                  ) : null)}
              </View>

              {photo.comments.length > 0 && (
                <Pressable style={styles.ticker} onPress={() => openSheet(photo)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={12} color="rgba(255,255,255,0.65)" />
                  <Text style={styles.tickerText} numberOfLines={1}>
                    {photo.comments[tickerIndex % photo.comments.length].displayName}:{' '}
                    {photo.comments[tickerIndex % photo.comments.length].text}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.55)" />
                </Pressable>
              )}

              <View style={styles.compactForm}>
                <TextInput
                  value={compactInput}
                  onChangeText={setCompactInput}
                  onFocus={() => setCompactFocused(true)}
                  onBlur={() => setCompactFocused(false)}
                  placeholder={photo.isMine ? '댓글을 남겨보세요' : '반응을 남겨보세요'}
                  placeholderTextColor="rgba(255,255,255,0.65)"
                  style={styles.compactInput}
                  maxLength={200}
                  onSubmitEditing={handleCompactSubmit}
                />
                <Pressable style={styles.compactSend} onPress={handleCompactSubmit}>
                  <Ionicons name="send" size={15} color="#231600" />
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </SafeAreaView>

      <Modal visible={!!sheetPhoto} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet}>
          <Pressable style={styles.sheetPanel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>반응 {thread?.length ?? 0}개</Text>
              <Pressable style={styles.sheetClose} onPress={closeSheet} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.textHi} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ gap: 14 }}>
              {!thread ? (
                <ActivityIndicator color={colors.yellow} style={{ marginTop: 20 }} />
              ) : thread.length === 0 ? (
                <Text style={styles.sheetEmpty}>아직 반응이 없어요</Text>
              ) : (
                thread.map((c) => (
                  <View key={c.id} style={{ gap: 10 }}>
                    <View style={styles.sheetRow}>
                      <InitialAvatar name={nameFor(c.userId)} gradient={avatarFor(c.userId)} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.sheetName}>{c.displayName}</Text>
                        <Text style={styles.sheetText}>{c.text}</Text>
                        <Pressable onPress={() => startReply(c)}>
                          <Text style={styles.sheetReplyBtn}>답글 달기</Text>
                        </Pressable>
                      </View>
                    </View>
                    {c.replies.map((r) => (
                      <View key={r.id} style={[styles.sheetRow, styles.sheetReplyRow]}>
                        <InitialAvatar name={nameFor(r.userId)} gradient={avatarFor(r.userId)} size={22} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.sheetName}>{r.displayName}</Text>
                          <Text style={styles.sheetText}>{r.text}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>

            {replyTarget && (
              <View style={styles.replyContext}>
                <Text style={styles.replyContextText}>{replyTarget.name}님에게 답글 다는 중</Text>
                <Pressable
                  onPress={() => {
                    setReplyTarget(null);
                    setCommentInput('');
                  }}
                >
                  <Text style={styles.replyContextCancel}>취소</Text>
                </Pressable>
              </View>
            )}

            {mentionMatches.length > 0 && (
              <View style={styles.mentionMenu}>
                {mentionMatches.map((f) => (
                  <Pressable key={f.id} style={styles.mentionItem} onPress={() => pickMention(f.displayName)}>
                    <InitialAvatar name={f.displayName} gradient={avatarFor(f.id)} size={20} />
                    <Text style={styles.mentionItemText}>{f.displayName}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.sheetInputRow}>
              <TextInput
                ref={commentInputRef}
                value={commentInput}
                onChangeText={setCommentInput}
                placeholder="댓글을 남겨보세요 · @로 멘션"
                placeholderTextColor={colors.textDim}
                style={styles.sheetInput}
                maxLength={200}
                onSubmitEditing={handleSheetSubmit}
              />
              <Pressable style={styles.compactSend} onPress={handleSheetSubmit} disabled={sending}>
                <Ionicons name="send" size={15} color="#231600" />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  floatingCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
  errorText: { color: colors.textMid, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.surfaceHi, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  retryBtnText: { fontSize: 12.5, fontFamily: 'SCDream-Bold', color: colors.textHi },

  tapzone: { position: 'absolute', top: 90, bottom: 150 },

  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 6 },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.yellow, borderRadius: 2 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingTop: 10 },
  headerName: { fontSize: 13, fontFamily: 'SCDream-ExtraBold', color: '#fff' },
  headerTime: { fontSize: 10.5, color: 'rgba(255,255,255,0.7)' },
  mineTag: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  mineTagText: { fontSize: 10, fontFamily: 'SCDream-Bold', color: 'rgba(255,255,255,0.85)' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center' },

  bottom: { marginTop: 'auto', paddingHorizontal: 14, paddingBottom: 8, gap: 10 },
  captionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  captionTxt: { flex: 1, fontSize: 12.5, color: 'rgba(255,255,255,0.92)' },
  savePill: { backgroundColor: colors.yellow, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  savePillText: { fontSize: 11, fontFamily: 'SCDream-ExtraBold', color: '#231600' },
  savePillPending: { backgroundColor: 'rgba(255,255,255,0.16)' },
  savePillPendingText: { fontSize: 11, fontFamily: 'SCDream-ExtraBold', color: 'rgba(255,255,255,0.75)' },

  ticker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  tickerText: { flex: 1, fontSize: 10.5, color: 'rgba(255,255,255,0.65)' },

  compactForm: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  compactInput: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    color: '#fff',
    paddingHorizontal: 16,
    fontSize: 12.5,
  },
  compactSend: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetPanel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    maxHeight: '65%',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 13, fontFamily: 'SCDream-ExtraBold', color: colors.textHi },
  sheetClose: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  sheetEmpty: { fontSize: 12.5, color: colors.textDim, textAlign: 'center', paddingVertical: 20 },
  sheetRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetReplyRow: { marginLeft: 38 },
  sheetName: { fontSize: 12, fontFamily: 'SCDream-ExtraBold', color: colors.textHi },
  sheetText: { fontSize: 12, color: colors.textMid, lineHeight: 17 },
  sheetReplyBtn: { fontSize: 10.5, fontFamily: 'SCDream-Bold', color: colors.textDim, marginTop: 2 },

  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHi,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 12,
  },
  replyContextText: { fontSize: 11, color: colors.textMid, fontFamily: 'SCDream-Bold' },
  replyContextCancel: { fontSize: 11, color: colors.textDim, fontFamily: 'SCDream-Bold' },

  mentionMenu: {
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 140,
    overflow: 'hidden',
  },
  mentionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  mentionItemText: { fontSize: 12, color: colors.textHi },

  sheetInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  sheetInput: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.4,
    borderColor: colors.line,
    backgroundColor: colors.bgVoid,
    color: colors.textHi,
    paddingHorizontal: 14,
    fontSize: 12.5,
  },
});
