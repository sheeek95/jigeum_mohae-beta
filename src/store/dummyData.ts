import type { AlbumItem, Friend, Group, InviteLink, WidgetPhoto } from './types';

const HOUR = 60 * 60 * 1000;
const now = Date.now();

export const initialFriends: Friend[] = [
  {
    id: 'f-minji',
    name: '민지',
    avatarGradient: ['#FF9AA6', '#8A6BC7'],
    dnd: false,
    statusText: '2시간 전 · 위젯 대기중',
  },
  {
    id: 'f-hyunwoo',
    name: '현우',
    avatarGradient: ['#9AD4FF', '#6B7FC7'],
    dnd: true,
    statusText: '방해금지 · 나중에 알림',
  },
  {
    id: 'f-seoyeon',
    name: '서연',
    avatarGradient: ['#FFD9A0', '#C77B9A'],
    dnd: false,
    statusText: '5분 전 · 사진 공유함',
  },
];

export const initialGroups: Group[] = [
  { id: 'g-우리끼리', name: '우리끼리', kind: 'group', memberCount: 6, dnd: false, subLabel: '친구 6명 · 공유 허용' },
  { id: 'g-가족방', name: '가족방', kind: 'group', memberCount: 4, dnd: false, subLabel: '가족 4명 · 공유 허용' },
  { id: 'p-f-minji', name: '민지', kind: 'personal', memberCount: 1, dnd: false, subLabel: '연인', friendId: 'f-minji' },
  { id: 'p-f-hyunwoo', name: '현우', kind: 'personal', memberCount: 1, dnd: true, subLabel: '방해금지 중 · 알림 지연', friendId: 'f-hyunwoo' },
];

export const initialWidgetPhoto: WidgetPhoto = {
  senderName: '서연',
  caption: '이거 방금 산 라떼 ☕',
  timeLabel: '3분 전',
  gradient: ['#5B3E86', '#3A2761'],
};

export const initialAlbum: AlbumItem[] = [
  {
    id: 'a-1',
    direction: 'received',
    peerName: '서연',
    caption: '이거 방금 산 라떼 ☕',
    gradient: ['#5B3E86', '#3A2761'],
    sentAt: now - 3 * 60 * 1000,
    expiresAt: now - 3 * 60 * 1000 + 24 * HOUR,
    saveStatus: 'none',
  },
  {
    id: 'a-2',
    direction: 'received',
    peerName: '민지',
    caption: '오늘 하늘 미쳤다',
    gradient: ['#6B4B96', '#2C1E4A'],
    sentAt: now - 5 * HOUR,
    expiresAt: now - 5 * HOUR + 24 * HOUR,
    saveStatus: 'pending',
  },
  {
    id: 'a-3',
    direction: 'sent',
    peerName: '가족방',
    caption: '저녁 메뉴 고민중',
    gradient: ['#4B6B96', '#1E2C4A'],
    sentAt: now - 20 * HOUR,
    expiresAt: now - 20 * HOUR + 24 * HOUR,
    saveStatus: 'rejected',
  },
];

export const initialInviteLink: InviteLink = {
  code: '8f3k2a91',
  createdAt: now,
  expiresAt: now + 7 * 24 * HOUR,
  used: false,
};
