export type AvatarGradient = readonly [string, string];

export interface Friend {
  id: string;
  name: string;
  avatarGradient: AvatarGradient;
  dnd: boolean;
  statusText: string;
}

export type GroupKind = 'group' | 'personal';

export interface Group {
  id: string;
  name: string;
  kind: GroupKind;
  memberCount: number;
  dnd: boolean;
  subLabel: string;
  friendId?: string; // for personal targets, links back to a Friend
}

export type SaveRequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface AlbumItem {
  id: string;
  direction: 'received' | 'sent';
  peerName: string;
  caption: string;
  gradient: AvatarGradient;
  sentAt: number;
  expiresAt: number;
  saveStatus: SaveRequestStatus;
}

export interface InviteLink {
  code: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

export interface IncomingInvite {
  id: string;
  name: string;
  suggestedGroupId: string;
}

export interface WidgetPhoto {
  senderName: string;
  caption: string;
  timeLabel: string;
  gradient: AvatarGradient;
}

export interface CapturedPhoto {
  takenAt: number;
  gradient: AvatarGradient;
  forFriendName?: string;
}

export interface DndSettings {
  enabled: boolean;
  scheduleEnabled: boolean;
  scheduleLabel: string;
}
