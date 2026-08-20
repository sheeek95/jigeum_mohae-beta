import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { api, API_URL, ApiError, resolveMediaUrl, setAuthToken } from '../api/client';
import { getOrCreateDeviceId } from '../api/identity';
import { syncAndroidWidget } from '../widgets/syncAndroidWidget';
import { requestIosWidgetReload, syncIosWidgetCredentials } from '../widgets/syncIosWidget';
import type {
  ApiDnd,
  ApiFriend,
  ApiGroup,
  ApiInvite,
  ApiInvitePreview,
  ApiReceivedPhoto,
  ApiSentPhoto,
  ApiUser,
  ApiWidgetPhoto,
} from '../api/types';
import type {
  AlbumItem,
  AvatarGradient,
  CapturedPhoto,
  DndSettings,
  Friend,
  Group,
  InviteLink,
  Me,
  SaveRequestStatus,
  WidgetPhoto,
} from './types';

type AuthStatus = 'idle' | 'loading' | 'ready' | 'error';

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
  album: AlbumItem[];
  capturedPhoto: CapturedPhoto | null;
  pokedIds: string[];

  completeOnboarding: () => void;
  bootstrap: () => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshFriends: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  refreshAlbum: () => Promise<void>;
  refreshWidget: () => Promise<void>;
  refreshInvite: () => Promise<void>;

  poke: (target: { userId: string } | { groupId: string }) => Promise<boolean>;
  loadInviteByCode: (code: string) => Promise<void>;
  acceptInvite: (code: string, groupIds?: string[]) => Promise<void>;
  clearPendingInvite: () => void;

  setCapturedPhoto: (photo: CapturedPhoto | null) => void;
  shareToTargets: (targetGroupIds: string[], caption?: string) => Promise<void>;

  requestSave: (photoId: string) => Promise<void>;
  resolveSave: (photoId: string, targetUserId: string, approve: boolean) => Promise<void>;

  setDnd: (patch: Partial<DndSettings>) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

function gradient(start: string, end: string): AvatarGradient {
  return [start, end];
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
    memberCount: g.memberCount,
    dnd: g.dnd,
    subLabel: g.kind === 'GROUP' ? `친구 ${g.memberCount}명 · 공유 허용` : g.dnd ? '방해금지 중 · 알림 지연' : '친구',
    friendId: g.friendId,
  };
}

function mapReceived(p: ApiReceivedPhoto): AlbumItem {
  return {
    id: p.deliveryId,
    direction: 'received',
    photoId: p.photoId,
    peerName: p.senderName,
    caption: p.caption,
    photoUrl: resolveMediaUrl(p.url),
    sentAt: new Date(p.createdAt).getTime(),
    expiresAt: new Date(p.expiresAt).getTime(),
    saveStatus: p.saveStatus.toLowerCase() as SaveRequestStatus,
  };
}

function mapSent(p: ApiSentPhoto): AlbumItem[] {
  return p.deliveries.map((d) => ({
    id: d.deliveryId,
    direction: 'sent',
    photoId: p.photoId,
    peerName: d.displayName,
    caption: p.caption,
    photoUrl: resolveMediaUrl(p.url),
    sentAt: new Date(p.createdAt).getTime(),
    expiresAt: new Date(p.expiresAt).getTime(),
    saveStatus: d.saveStatus.toLowerCase() as SaveRequestStatus,
    targetUserId: d.userId,
  }));
}

function mapWidget(p: ApiWidgetPhoto | null): WidgetPhoto | null {
  if (!p) return null;
  return {
    senderName: p.senderName,
    caption: p.caption,
    timeLabel: new Date(p.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    photoUrl: resolveMediaUrl(p.url),
  };
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
      album: [],
      capturedPhoto: null,
      pokedIds: [],

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
            const deviceId = await getOrCreateDeviceId();
            const { token, user } = await api.post<{ token: string; user: ApiUser }>('/auth/device', { deviceId });
            setAuthToken(token);
            syncIosWidgetCredentials(token, API_URL);
            set({
              me: { id: user.id, displayName: user.displayName, avatarGradient: gradient(user.avatarStart, user.avatarEnd) },
              authStatus: 'ready',
            });
            await get().refreshAll();
          } catch (err) {
            set({ authStatus: 'error', authError: err instanceof Error ? err.message : '연결에 실패했어요' });
            bootstrapPromise = null; // allow a retry
          }
        })();
        return bootstrapPromise;
      },

      refreshAll: async () => {
        await Promise.all([
          get().refreshFriends(),
          get().refreshGroups(),
          get().refreshAlbum(),
          get().refreshWidget(),
          get().refreshInvite(),
          (async () => {
            const { dnd } = await api.get<{ dnd: ApiDnd }>('/settings/dnd');
            set({ dnd: mapDnd(dnd) });
          })(),
        ]);
      },

      refreshFriends: async () => {
        const { friends } = await api.get<{ friends: ApiFriend[] }>('/friends');
        set({ friends: friends.map(mapFriend) });
      },

      refreshGroups: async () => {
        const { groups } = await api.get<{ groups: ApiGroup[] }>('/groups');
        set({ groups: groups.map(mapGroup) });
      },

      refreshAlbum: async () => {
        const [{ items: received }, { items: sent }] = await Promise.all([
          api.get<{ items: ApiReceivedPhoto[] }>('/photos/received'),
          api.get<{ items: ApiSentPhoto[] }>('/photos/sent'),
        ]);
        const merged = [...received.map(mapReceived), ...sent.flatMap(mapSent)].sort((a, b) => b.sentAt - a.sentAt);
        set({ album: merged });
      },

      refreshWidget: async () => {
        const { photo } = await api.get<{ photo: ApiWidgetPhoto | null }>('/photos/widget/latest');
        const widgetPhoto = mapWidget(photo);
        set({ widgetPhoto });
        // Push straight to any placed Android home-screen widget too — see
        // syncAndroidWidget.tsx for why this matters (30-min native floor).
        syncAndroidWidget(
          widgetPhoto && {
            url: widgetPhoto.photoUrl,
            senderName: widgetPhoto.senderName,
            caption: widgetPhoto.caption,
            timeLabel: widgetPhoto.timeLabel,
          }
        ).catch(() => {});
        // iOS side just needs a "refresh now" nudge — the widget's own
        // TimelineProvider fetches the photo itself (see syncIosWidget.ts).
        requestIosWidgetReload();
      },

      refreshInvite: async () => {
        const { invite } = await api.get<{ invite: ApiInvite }>('/invites/mine');
        set({ inviteLink: { code: invite.code, expiresAt: new Date(invite.expiresAt).getTime() } });
      },

      poke: async (target) => {
        const body = 'userId' in target ? { toUserId: target.userId } : { toGroupId: target.groupId };
        const { anyDelayed } = await api.post<{ anyDelayed: boolean }>('/pokes', body);
        const id = 'userId' in target ? target.userId : target.groupId;
        set((state) => ({ pokedIds: state.pokedIds.includes(id) ? state.pokedIds : [...state.pokedIds, id] }));
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

      requestSave: async (photoId) => {
        await api.post(`/photos/${photoId}/request-save`);
        await get().refreshAlbum();
      },

      resolveSave: async (photoId, targetUserId, approve) => {
        await api.post(`/photos/${photoId}/deliveries/${targetUserId}/resolve-save`, { approve });
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
