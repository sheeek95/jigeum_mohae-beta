import * as KakaoLogin from '@react-native-seoul/kakao-login';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { api, ApiError, resolveMediaUrl, setAuthToken } from '../api/client';
import { getOrCreateDeviceId } from '../api/identity';
import { clearStoredSessionToken, getStoredSessionToken, setStoredSessionToken } from '../api/session';
import { getApiUrl, loadStoredApiUrl, setApiUrl } from '../api/urlConfig';
import { registerForPushNotificationsAsync } from '../notifications/registerPush';
import { syncAndroidWidget } from '../widgets/syncAndroidWidget';
import { requestIosWidgetReload, syncIosWidgetCredentials } from '../widgets/syncIosWidget';
import type {
  ApiComment,
  ApiDnd,
  ApiFriend,
  ApiGroup,
  ApiGroupInvite,
  ApiGroupPhoto,
  ApiInvite,
  ApiInvitePreview,
  ApiNotification,
  ApiNotificationType,
  ApiPendingGroupInvite,
  ApiReceivedPhoto,
  ApiSentPhoto,
  ApiUser,
  ApiWidgetPhoto,
} from '../api/types';
import type {
  AppNotification,
  AvatarGradient,
  CapturedPhoto,
  Comment,
  DndSettings,
  Friend,
  Group,
  GroupInvite,
  GroupPhoto,
  InviteLink,
  Me,
  NotificationType,
  PendingGroupInvite,
  SavedPhotoItem,
  SaveRequestStatus,
  SentPhotoItem,
  WidgetPhoto,
} from './types';

// 'needs-login': no account to recover at all — a fresh Kakao sign-in
// creates one. 'needs-kakao-link': a pre-Kakao device-based account exists
// and is already the active session — logging in with Kakao here LINKS it
// (POST /auth/link-kakao) instead of creating a new one, so existing data
// survives the switch.
type AuthStatus = 'idle' | 'loading' | 'ready' | 'error' | 'needs-login' | 'needs-kakao-link';

// Module-level (not store state) so every caller shares one in-flight
// promise regardless of render timing — see bootstrap() below.
let bootstrapPromise: Promise<void> | null = null;

interface AppState {
  hasOnboarded: boolean;
  authStatus: AuthStatus;
  authError: string | null;
  me: Me | null;

  friends: Friend[];
  groups: Group[];
  dnd: DndSettings;
  inviteLink: InviteLink | null;
  pendingInvite: ApiInvitePreview | null;
  widgetPhoto: WidgetPhoto | null;
  savedPhotos: SavedPhotoItem[];
  sentPhotos: SentPhotoItem[];
  groupPhotos: Record<string, GroupPhoto[]>;
  commentThreads: Record<string, Comment[]>;
  capturedPhoto: CapturedPhoto | null;
  pokedIds: string[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  groupInvites: GroupInvite[];
  groupPendingInvites: Record<string, PendingGroupInvite[]>;

  apiUrl: string;
  completeOnboarding: () => void;
  bootstrap: () => Promise<void>;
  loginWithKakao: () => Promise<void>;
  registerPushToken: () => Promise<void>;
  changeApiUrl: (url: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshFriends: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  refreshAlbum: () => Promise<void>;
  refreshWidget: () => Promise<void>;
  refreshInvite: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  fetchGroupPhotos: (groupId: string) => Promise<GroupPhoto[]>;
  fetchComments: (photoId: string) => Promise<Comment[]>;
  submitComment: (photoId: string, text: string, parentId?: string) => Promise<void>;
  refreshGroupInvites: () => Promise<void>;
  respondToGroupInvite: (inviteId: string, approve: boolean) => Promise<void>;
  fetchGroupPendingInvites: (groupId: string) => Promise<PendingGroupInvite[]>;

  poke: (userId: string) => Promise<boolean>;
  loadInviteByCode: (code: string) => Promise<void>;
  acceptInvite: (code: string, groupIds?: string[]) => Promise<void>;
  clearPendingInvite: () => void;

  setCapturedPhoto: (photo: CapturedPhoto | null) => void;
  shareToTargets: (targetGroupIds: string[], caption?: string) => Promise<void>;

  requestSave: (photoId: string) => Promise<void>;
  resolveSave: (photoId: string, targetUserId: string, approve: boolean) => Promise<void>;
  deleteSentPhoto: (photoId: string) => Promise<void>;

  setDnd: (patch: Partial<DndSettings>) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  inviteGroupMember: (groupId: string, userId: string) => Promise<void>;
  removeGroupMember: (groupId: string, userId: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

function gradient(start: string, end: string): AvatarGradient {
  return [start, end];
}

// Shared tail end of every successful auth path (resumed session, a
// device-account that turned out already linked, or a fresh Kakao
// login/link) — persists the session, sets `me`, flips authStatus to
// 'ready', and kicks off the usual post-auth side effects.
async function enterReady(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
  token: string,
  user: ApiUser
) {
  setAuthToken(token);
  await setStoredSessionToken(token);
  syncIosWidgetCredentials(token, getApiUrl());
  set({
    me: { id: user.id, displayName: user.displayName, avatarGradient: gradient(user.avatarStart, user.avatarEnd) },
    authStatus: 'ready',
  });
  get().registerPushToken(); // best-effort, never blocks
  await get().refreshAll();
}

function mapFriend(f: ApiFriend): Friend {
  return {
    id: f.id,
    name: f.displayName,
    avatarGradient: gradient(f.avatarStart, f.avatarEnd),
    dnd: f.dnd,
    statusText: f.dnd ? '방해금지 중' : '친구',
  };
}

function mapGroup(g: ApiGroup): Group {
  return {
    id: g.id,
    name: g.name,
    kind: g.kind === 'GROUP' ? 'group' : 'personal',
    isOwner: g.isOwner,
    memberCount: g.memberCount,
    dnd: g.dnd,
    subLabel: g.kind === 'GROUP' ? `친구 ${g.memberCount}명 · 공유 허용` : g.dnd ? '방해금지 중 · 알림 지연' : '친구',
    friendId: g.friendId,
    members: g.members,
  };
}

function mapGroupInvite(i: ApiGroupInvite): GroupInvite {
  return {
    id: i.id,
    groupId: i.groupId,
    groupName: i.groupName,
    inviterName: i.inviterName,
    createdAt: new Date(i.createdAt).getTime(),
  };
}

function mapPendingGroupInvite(i: ApiPendingGroupInvite): PendingGroupInvite {
  return { id: i.id, userId: i.userId, displayName: i.displayName };
}

function mapSavedPhoto(p: ApiReceivedPhoto): SavedPhotoItem {
  return {
    id: p.deliveryId,
    photoId: p.photoId,
    peerName: p.senderName,
    caption: p.caption,
    photoUrl: resolveMediaUrl(p.url),
    groupName: p.groupName,
    sentAt: new Date(p.createdAt).getTime(),
    savedAt: p.savedAt ? new Date(p.savedAt).getTime() : null,
  };
}

function mapSentPhoto(p: ApiSentPhoto): SentPhotoItem[] {
  return p.deliveries.map((d) => ({
    id: d.deliveryId,
    photoId: p.photoId,
    peerName: d.displayName,
    caption: p.caption,
    photoUrl: resolveMediaUrl(p.url),
    sentAt: new Date(p.createdAt).getTime(),
    expiresAt: new Date(p.expiresAt).getTime(),
    saveStatus: d.saveStatus.toLowerCase() as SaveRequestStatus,
    targetUserId: d.userId,
    groupId: p.groupId,
    comments: p.comments,
  }));
}

function mapGroupPhoto(p: ApiGroupPhoto): GroupPhoto {
  return {
    photoId: p.photoId,
    photoUrl: resolveMediaUrl(p.url),
    caption: p.caption,
    senderId: p.senderId,
    senderName: p.senderName,
    createdAt: new Date(p.createdAt).getTime(),
    expiresAt: new Date(p.expiresAt).getTime(),
    isMine: p.isMine,
    saveStatus: p.saveStatus ? (p.saveStatus.toLowerCase() as SaveRequestStatus) : null,
    comments: p.comments,
  };
}

function mapComment(c: ApiComment): Comment {
  return {
    id: c.id,
    userId: c.userId,
    displayName: c.displayName,
    text: c.text,
    createdAt: new Date(c.createdAt).getTime(),
    replies: c.replies.map((r) => ({
      id: r.id,
      userId: r.userId,
      displayName: r.displayName,
      text: r.text,
      createdAt: new Date(r.createdAt).getTime(),
    })),
  };
}

const NOTIFICATION_TYPE_MAP: Record<ApiNotificationType, NotificationType> = {
  FRIEND_ADDED: 'friend-added',
  POKE: 'poke',
  PHOTO_RECEIVED: 'photo-received',
  PHOTO_REACTION: 'photo-reaction',
  PHOTO_REPLY: 'photo-reply',
  SAVE_REQUEST: 'save-request',
  GROUP_INVITE: 'group-invite',
  GROUP_MEMBER_JOINED: 'group-member-joined',
};

function mapNotification(n: ApiNotification): AppNotification {
  return {
    id: n.id,
    type: NOTIFICATION_TYPE_MAP[n.type],
    title: n.title,
    body: n.body,
    photoId: n.photoId,
    groupId: n.groupId,
    fromUserName: n.fromUserName,
    read: n.read,
    createdAt: new Date(n.createdAt).getTime(),
  };
}

function mapWidget(p: ApiWidgetPhoto | null): WidgetPhoto | null {
  if (!p) return null;
  return {
    senderName: p.senderName,
    groupName: p.groupName,
    caption: p.caption,
    timeLabel: new Date(p.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    photoUrl: resolveMediaUrl(p.url),
  };
}

// Render's free-tier cold start (and mobile networks generally) means two
// calls to the same refresh*() can resolve out of order — e.g. a slow call
// issued right after mount can land AFTER a fast one issued by a later user
// action, silently overwriting fresher state with stale data (this is what
// made a just-created group "disappear"). Each refresh call takes a ticket
// and only applies its result if no newer call for the same key has started.
const latestRequestSeq: Record<string, number> = Object.create(null);
function takeTicket(key: string): number {
  return (latestRequestSeq[key] = (latestRequestSeq[key] ?? 0) + 1);
}
function isCurrentTicket(key: string, ticket: number): boolean {
  return latestRequestSeq[key] === ticket;
}

function mapDnd(d: ApiDnd): DndSettings {
  return { enabled: d.enabled, scheduleEnabled: d.scheduleEnabled, scheduleStart: d.scheduleStart, scheduleEnd: d.scheduleEnd };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasOnboarded: false,
      authStatus: 'idle',
      authError: null,
      me: null,

      friends: [],
      groups: [],
      dnd: { enabled: false, scheduleEnabled: false, scheduleStart: '23:00', scheduleEnd: '08:00' },
      inviteLink: null,
      pendingInvite: null,
      widgetPhoto: null,
      savedPhotos: [],
      sentPhotos: [],
      groupPhotos: {},
      commentThreads: {},
      capturedPhoto: null,
      pokedIds: [],
      notifications: [],
      unreadNotificationCount: 0,
      groupInvites: [],
      groupPendingInvites: {},
      apiUrl: getApiUrl(),

      completeOnboarding: () => set({ hasOnboarded: true }),

      // Both the root layout and the invite deep-link screen call this on
      // mount, so a status-flag guard alone isn't enough — two calls in the
      // same tick can both see 'idle' before either's `set()` lands and end
      // up registering two backend accounts for one device. Cache the
      // in-flight promise itself for true single-flight semantics.
      bootstrap: () => {
        if (bootstrapPromise) return bootstrapPromise;
        if (get().authStatus === 'ready') return Promise.resolve();
        bootstrapPromise = (async () => {
          set({ authStatus: 'loading', authError: null });
          try {
            const apiUrl = await loadStoredApiUrl();
            set({ apiUrl });

            // 1. Already logged in via Kakao on a previous launch — resume
            // straight from the stored session, no re-auth call at all.
            const stored = await getStoredSessionToken();
            if (stored) {
              setAuthToken(stored);
              try {
                const { user } = await api.get<{ user: ApiUser }>('/auth/me');
                await enterReady(set, get, stored, user);
                return;
              } catch (err) {
                if (err instanceof ApiError && err.status === 401) {
                  // The token itself is genuinely invalid/expired — clear it
                  // and fall through to step 2.
                  await clearStoredSessionToken();
                  setAuthToken(null);
                } else {
                  // A transient failure (network hiccup, Render cold start,
                  // a 5xx) — the session is still perfectly valid. Treating
                  // this the same as an invalid token was the actual bug
                  // behind "invite code and name keep resetting": it threw
                  // away a good session and fell into step 2's device-based
                  // fallback, which mints a brand-new throwaway account.
                  // Surface an error instead so the user can just retry.
                  throw err;
                }
              }
            }

            // 2. No stored session. Recover a pre-Kakao device-based account
            // if one exists, so linking (not a fresh signup) is offered
            // first and nothing already there gets lost.
            const deviceId = await getOrCreateDeviceId();
            try {
              const { token, user } = await api.post<{ token: string; user: ApiUser }>('/auth/device', { deviceId });
              if (user.kakaoId) {
                // Already linked from elsewhere (e.g. switched back to this
                // device after linking on another one) — resume normally.
                await enterReady(set, get, token, user);
                return;
              }
              setAuthToken(token);
              set({ authStatus: 'needs-kakao-link' });
              return;
            } catch {
              // 3. Nothing to recover at all — a fresh Kakao sign-in ahead.
              set({ authStatus: 'needs-login' });
              return;
            }
          } catch (err) {
            set({ authStatus: 'error', authError: err instanceof Error ? err.message : '연결에 실패했어요' });
            bootstrapPromise = null; // allow a retry
          }
        })();
        return bootstrapPromise;
      },

      // Lets Settings point a beta APK at a different backend without a
      // rebuild — EXPO_PUBLIC_API_URL is baked in at build time (see
      // urlConfig.ts), so this is the only way to change it afterwards.
      changeApiUrl: async (url) => {
        await setApiUrl(url);
        set({ apiUrl: getApiUrl(), authStatus: 'idle', me: null });
        bootstrapPromise = null;
        setAuthToken(null);
        // A stored session token is only valid against the server that
        // issued it — pointing at a different backend needs a fresh login.
        await clearStoredSessionToken();
        await get().bootstrap();
      },

      refreshAll: async () => {
        await Promise.all([
          get().refreshFriends(),
          get().refreshGroups(),
          get().refreshAlbum(),
          get().refreshWidget(),
          get().refreshInvite(),
          get().refreshUnreadCount(),
          get().refreshGroupInvites(),
          (async () => {
            const { dnd } = await api.get<{ dnd: ApiDnd }>('/settings/dnd');
            set({ dnd: mapDnd(dnd) });
          })(),
        ]);
      },

      refreshFriends: async () => {
        const ticket = takeTicket('friends');
        const { friends } = await api.get<{ friends: ApiFriend[] }>('/friends');
        if (!isCurrentTicket('friends', ticket)) return;
        set({ friends: friends.map(mapFriend) });
      },

      refreshGroups: async () => {
        const ticket = takeTicket('groups');
        const { groups } = await api.get<{ groups: ApiGroup[] }>('/groups');
        if (!isCurrentTicket('groups', ticket)) return;
        set({ groups: groups.map(mapGroup) });
      },

      refreshAlbum: async () => {
        const ticket = takeTicket('album');
        const [{ items: received }, { items: sent }] = await Promise.all([
          api.get<{ items: ApiReceivedPhoto[] }>('/photos/received'),
          api.get<{ items: ApiSentPhoto[] }>('/photos/sent'),
        ]);
        if (!isCurrentTicket('album', ticket)) return;
        set({
          savedPhotos: received.map(mapSavedPhoto),
          sentPhotos: sent.flatMap(mapSentPhoto),
        });
      },

      refreshWidget: async () => {
        const ticket = takeTicket('widget');
        const { photo } = await api.get<{ photo: ApiWidgetPhoto | null }>('/photos/widget/latest');
        if (!isCurrentTicket('widget', ticket)) return;
        const widgetPhoto = mapWidget(photo);
        set({ widgetPhoto });
        // Push straight to any placed Android home-screen widget too — see
        // syncAndroidWidget.tsx for why this matters (30-min native floor).
        syncAndroidWidget(
          widgetPhoto && {
            url: widgetPhoto.photoUrl,
            senderName: widgetPhoto.senderName,
            groupName: widgetPhoto.groupName,
            caption: widgetPhoto.caption,
            timeLabel: widgetPhoto.timeLabel,
          }
        ).catch(() => {});
        // iOS side just needs a "refresh now" nudge — the widget's own
        // TimelineProvider fetches the photo itself (see syncIosWidget.ts).
        requestIosWidgetReload();
      },

      refreshInvite: async () => {
        const ticket = takeTicket('invite');
        const { invite } = await api.get<{ invite: ApiInvite }>('/invites/mine');
        if (!isCurrentTicket('invite', ticket)) return;
        set({ inviteLink: { code: invite.code } });
      },

      refreshNotifications: async () => {
        const ticket = takeTicket('notifications');
        const { notifications } = await api.get<{ notifications: ApiNotification[] }>('/notifications');
        if (!isCurrentTicket('notifications', ticket)) return;
        set({
          notifications: notifications.map(mapNotification),
          unreadNotificationCount: notifications.filter((n) => !n.read).length,
        });
      },

      refreshUnreadCount: async () => {
        const { count } = await api.get<{ count: number }>('/notifications/unread-count');
        set({ unreadNotificationCount: count });
      },

      markNotificationsRead: async () => {
        await api.post('/notifications/read-all');
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadNotificationCount: 0,
        }));
      },

      // Fetched fresh on every story-viewer open rather than kept warm in
      // the background — this is a point-in-time "what's live right now"
      // view, not something that needs continuous polling like the widget.
      fetchGroupPhotos: async (groupId) => {
        const { items } = await api.get<{ items: ApiGroupPhoto[] }>(`/groups/${groupId}/photos`);
        const mapped = items.map(mapGroupPhoto);
        set((state) => ({ groupPhotos: { ...state.groupPhotos, [groupId]: mapped } }));
        return mapped;
      },

      fetchComments: async (photoId) => {
        const { comments } = await api.get<{ comments: ApiComment[] }>(`/photos/${photoId}/comments`);
        const mapped = comments.map(mapComment);
        set((state) => ({ commentThreads: { ...state.commentThreads, [photoId]: mapped } }));
        return mapped;
      },

      submitComment: async (photoId, text, parentId) => {
        await api.post(`/photos/${photoId}/comments`, { text, parentId });
        await get().fetchComments(photoId);
      },

      refreshGroupInvites: async () => {
        const ticket = takeTicket('groupInvites');
        const { invites } = await api.get<{ invites: ApiGroupInvite[] }>('/groups/invites');
        if (!isCurrentTicket('groupInvites', ticket)) return;
        set({ groupInvites: invites.map(mapGroupInvite) });
      },

      respondToGroupInvite: async (inviteId, approve) => {
        await api.post(`/groups/invites/${inviteId}/respond`, { approve });
        set((state) => ({ groupInvites: state.groupInvites.filter((i) => i.id !== inviteId) }));
        if (approve) await get().refreshGroups();
      },

      // Owner-only — used by the group-management screen to grey out
      // friends already invited and waiting on a response.
      fetchGroupPendingInvites: async (groupId) => {
        const { invites } = await api.get<{ invites: ApiPendingGroupInvite[] }>(`/groups/${groupId}/invites`);
        const mapped = invites.map(mapPendingGroupInvite);
        set((state) => ({ groupPendingInvites: { ...state.groupPendingInvites, [groupId]: mapped } }));
        return mapped;
      },

      poke: async (userId) => {
        const { anyDelayed } = await api.post<{ anyDelayed: boolean }>('/pokes', { toUserId: userId });
        set((state) => ({ pokedIds: state.pokedIds.includes(userId) ? state.pokedIds : [...state.pokedIds, userId] }));
        return anyDelayed;
      },

      loadInviteByCode: async (code) => {
        const { invite } = await api.get<{ invite: ApiInvitePreview }>(`/invites/${code}`);
        set({ pendingInvite: invite });
      },

      acceptInvite: async (code, groupIds) => {
        await api.post(`/invites/${code}/accept`, { groupIds });
        set({ pendingInvite: null });
        await Promise.all([get().refreshFriends(), get().refreshGroups()]);
      },

      clearPendingInvite: () => set({ pendingInvite: null }),

      setCapturedPhoto: (photo) => set({ capturedPhoto: photo }),

      shareToTargets: async (targetGroupIds, caption = '') => {
        const { capturedPhoto } = get();
        if (!capturedPhoto || targetGroupIds.length === 0) return;

        const form = new FormData();
        if (Platform.OS === 'web') {
          // Web's FormData is the standard browser one — it needs a real Blob,
          // not React Native's native-only {uri,name,type} shorthand below.
          const blob = await (await fetch(capturedPhoto.uri)).blob();
          form.append('photo', blob, 'photo.jpg');
        } else {
          form.append('photo', {
            uri: capturedPhoto.uri,
            name: 'photo.jpg',
            type: 'image/jpeg',
          } as unknown as Blob);
        }
        form.append('caption', caption);
        form.append('targetGroupIds', JSON.stringify(targetGroupIds));

        await api.postForm('/photos', form);
        set({ capturedPhoto: null });
        await Promise.all([get().refreshAlbum(), get().refreshWidget()]);

        // Best-effort cleanup of the local temp capture (native only — web
        // blob: URLs aren't files expo-file-system can address).
        if (Platform.OS !== 'web') {
          try {
            new File(capturedPhoto.uri).delete();
          } catch {
            // already gone — fine to ignore
          }
        }
      },

      // Called from the mandatory login screen. authStatus decides which
      // server endpoint the resulting Kakao token goes to: 'needs-kakao-link'
      // means there's already an authenticated pre-Kakao account to attach
      // it to (preserving its data); anything else is a fresh sign-in.
      loginWithKakao: async () => {
        const { accessToken } = await KakaoLogin.login();
        const path = get().authStatus === 'needs-kakao-link' ? '/auth/link-kakao' : '/auth/kakao';
        const { token, user } = await api.post<{ token: string; user: ApiUser }>(path, { accessToken });
        await enterReady(set, get, token, user);
      },

      registerPushToken: async () => {
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) await api.post('/push/register', { token });
        } catch {
          // best-effort — no push this session is fine, never surfaced to the user
        }
      },

      requestSave: async (photoId) => {
        await api.post(`/photos/${photoId}/request-save`);
        await get().refreshAlbum();
      },

      resolveSave: async (photoId, targetUserId, approve) => {
        await api.post(`/photos/${photoId}/deliveries/${targetUserId}/resolve-save`, { approve });
        await get().refreshAlbum();
      },

      deleteSentPhoto: async (photoId) => {
        await api.del(`/photos/${photoId}`);
        await get().refreshAlbum();
      },

      setDnd: async (patch) => {
        const { dnd } = await api.patch<{ dnd: ApiDnd }>('/settings/dnd', patch);
        set({ dnd: mapDnd(dnd) });
      },

      addGroup: async (name) => {
        await api.post('/groups', { name });
        await get().refreshGroups();
      },

      // Creates a pending GroupInvite, not an immediate join — the invitee
      // shows up as a member only once they accept it themselves.
      inviteGroupMember: async (groupId, userId) => {
        await api.post(`/groups/${groupId}/members`, { userId });
        await get().fetchGroupPendingInvites(groupId);
      },

      removeGroupMember: async (groupId, userId) => {
        await api.del(`/groups/${groupId}/members/${userId}`);
        await get().refreshGroups();
      },

      updateDisplayName: async (name) => {
        const { user } = await api.patch<{ user: ApiUser }>('/auth/me', { displayName: name });
        set({ me: { id: user.id, displayName: user.displayName, avatarGradient: gradient(user.avatarStart, user.avatarEnd) } });
      },
    }),
    {
      name: 'jigeum-mohae-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ hasOnboarded: state.hasOnboarded }),
    }
  )
);

export { ApiError };
