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
  friendId?: string | null;
  members?: { id: string; displayName: string }[];
}

export type SaveRequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

// One row per (photo, recipient) pair — flattened so both "받은 사진" and
// "보낸 사진" render as simple cards, and a sender can approve/reject a
// specific recipient's save request inline (targetUserId + photoId).
export interface AlbumItem {
  id: string; // deliveryId
  direction: 'received' | 'sent';
  photoId: string;
  peerName: string;
  caption: string;
  photoUrl: string;
  sentAt: number;
  expiresAt: number;
  saveStatus: SaveRequestStatus;
  targetUserId?: string; // sent items only — who to approve/reject for
  groupId?: string | null; // sent items only — which of my groups this went to
  myReaction?: string | null; // received items only — my own reaction text, if left
  reactions?: PhotoReaction[]; // sent items only — every recipient's reaction
}

export interface PhotoReaction {
  userId: string;
  displayName: string;
  text: string;
}

export type NotificationType = 'friend-added' | 'poke' | 'photo-received' | 'photo-reaction' | 'save-request';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  photoId: string | null;
  fromUserName: string | null;
  read: boolean;
  createdAt: number;
}

export interface InviteLink {
  code: string;
}

export interface WidgetPhoto {
  senderName: string;
  groupName: string | null;
  caption: string;
  timeLabel: string;
  photoUrl: string;
}

export interface CapturedPhoto {
  uri: string;
  takenAt: number;
}

export interface DndSettings {
  enabled: boolean;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
}

export interface Me {
  id: string;
  displayName: string;
  avatarGradient: AvatarGradient;
}
