import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  initialAlbum,
  initialFriends,
  initialGroups,
  initialInviteLink,
  initialWidgetPhoto,
} from './dummyData';
import type {
  AlbumItem,
  AvatarGradient,
  CapturedPhoto,
  DndSettings,
  Friend,
  Group,
  IncomingInvite,
  InviteLink,
  SaveRequestStatus,
  WidgetPhoto,
} from './types';

const HOUR = 60 * 60 * 1000;
const SAVE_REQUEST_DEMO_DELAY = 2200;

type WidgetMode = 'waiting' | 'photo';

interface AppState {
  hasOnboarded: boolean;
  friends: Friend[];
  groups: Group[];
  album: AlbumItem[];
  widgetMode: WidgetMode;
  widgetPhoto: WidgetPhoto;
  inviteLink: InviteLink;
  incomingInvites: IncomingInvite[];
  capturedPhoto: CapturedPhoto | null;
  dnd: DndSettings;
  pokedIds: string[];

  completeOnboarding: () => void;
  poke: (id: string) => void;
  toggleWidgetMode: () => void;
  setCapturedPhoto: (photo: CapturedPhoto | null) => void;
  shareToTargets: (targetIds: string[]) => void;
  requestSave: (albumItemId: string) => void;
  resolveSaveRequest: (albumItemId: string, status: SaveRequestStatus) => void;
  acceptInvite: (inviteId: string) => void;
  declineInvite: (inviteId: string) => void;
  regenerateInviteLink: () => void;
  toggleDnd: () => void;
  toggleGroupDnd: (id: string) => void;
  addGroup: (name: string) => void;
}

function randomGradient(): AvatarGradient {
  const palette: AvatarGradient[] = [
    ['#FF9AA6', '#8A6BC7'],
    ['#9AD4FF', '#6B7FC7'],
    ['#FFD9A0', '#C77B9A'],
    ['#A0FFD9', '#6BC7A0'],
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}

function randomCode() {
  return Math.random().toString(36).slice(2, 10);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasOnboarded: false,
      friends: initialFriends,
      groups: initialGroups,
      album: initialAlbum,
      widgetMode: 'waiting',
      widgetPhoto: initialWidgetPhoto,
      inviteLink: initialInviteLink,
      incomingInvites: [{ id: 'inv-hyunwoo', name: '현우', suggestedGroupId: 'g-우리끼리' }],
      capturedPhoto: null,
      dnd: { enabled: true, scheduleEnabled: true, scheduleLabel: '매일 23:00 – 08:00' },
      pokedIds: [],

      completeOnboarding: () => set({ hasOnboarded: true }),

      poke: (id) =>
        set((state) => ({
          pokedIds: state.pokedIds.includes(id) ? state.pokedIds : [...state.pokedIds, id],
        })),

      toggleWidgetMode: () =>
        set((state) => ({ widgetMode: state.widgetMode === 'waiting' ? 'photo' : 'waiting' })),

      setCapturedPhoto: (photo) => set({ capturedPhoto: photo }),

      shareToTargets: (targetIds) => {
        const { groups, capturedPhoto, album } = get();
        if (!capturedPhoto || targetIds.length === 0) return;
        const now = Date.now();
        const newItems: AlbumItem[] = targetIds.map((id) => {
          const target = groups.find((g) => g.id === id);
          return {
            id: `a-${now}-${id}`,
            direction: 'sent',
            peerName: target?.name ?? '알 수 없음',
            caption: '방금 보낸 사진',
            gradient: capturedPhoto.gradient,
            sentAt: now,
            expiresAt: now + 24 * HOUR,
            saveStatus: 'none',
          };
        });
        set({
          album: [...newItems, ...album],
          capturedPhoto: null,
          widgetMode: 'photo',
          widgetPhoto: {
            senderName: '나',
            caption: '방금 보낸 사진',
            timeLabel: '방금',
            gradient: capturedPhoto.gradient,
          },
        });
      },

      requestSave: (albumItemId) => {
        set((state) => ({
          album: state.album.map((item) =>
            item.id === albumItemId ? { ...item, saveStatus: 'pending' } : item
          ),
        }));
        // Demo-only: simulate the sender approving the save request after a short delay.
        // Real approval flow requires the backend (see SPEC.md phase 3).
        setTimeout(() => {
          get().resolveSaveRequest(albumItemId, 'approved');
        }, SAVE_REQUEST_DEMO_DELAY);
      },

      resolveSaveRequest: (albumItemId, status) =>
        set((state) => ({
          album: state.album.map((item) =>
            item.id === albumItemId ? { ...item, saveStatus: status } : item
          ),
        })),

      acceptInvite: (inviteId) => {
        const invite = get().incomingInvites.find((i) => i.id === inviteId);
        if (!invite) return;
        const newFriend: Friend = {
          id: `f-${randomCode()}`,
          name: invite.name,
          avatarGradient: randomGradient(),
          dnd: false,
          statusText: '방금 친구가 됐어요',
        };
        set((state) => ({
          friends: [newFriend, ...state.friends],
          groups: [
            ...state.groups,
            {
              id: `p-${newFriend.id}`,
              name: newFriend.name,
              kind: 'personal',
              memberCount: 1,
              dnd: false,
              subLabel: '새 친구',
              friendId: newFriend.id,
            },
          ],
          incomingInvites: state.incomingInvites.filter((i) => i.id !== inviteId),
        }));
      },

      declineInvite: (inviteId) =>
        set((state) => ({
          incomingInvites: state.incomingInvites.filter((i) => i.id !== inviteId),
        })),

      regenerateInviteLink: () => {
        const now = Date.now();
        set({
          inviteLink: { code: randomCode(), createdAt: now, expiresAt: now + 7 * 24 * HOUR, used: false },
        });
      },

      toggleDnd: () => set((state) => ({ dnd: { ...state.dnd, enabled: !state.dnd.enabled } })),

      toggleGroupDnd: (id) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, dnd: !g.dnd } : g)),
        })),

      addGroup: (name) =>
        set((state) => ({
          groups: [
            ...state.groups,
            {
              id: `g-${randomCode()}`,
              name,
              kind: 'group',
              memberCount: 1,
              dnd: false,
              subLabel: '친구 1명 · 공유 허용',
            },
          ],
        })),
    }),
    {
      name: 'jigeum-mohae-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ hasOnboarded: state.hasOnboarded, dnd: state.dnd }),
    }
  )
);
