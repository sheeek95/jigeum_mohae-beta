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
  isOwner: boolean;
  memberCount: number;
  dnd: boolean;
  subLabel: string;
  friendId?: string | null;
  members?: { id: string; displayName: string }[];
}

// A pending ask to join a GROUP-kind group, waiting on my response.
export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  inviterName: string;
  createdAt: number;
}

// Owner-only: someone I've invited to a group who hasn't responded yet.
export interface PendingGroupInvite {
  id: string;
  userId: string;
  displayName: string;
}

export type SaveRequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface CommentPreview {
  userId: string;
  displayName: string;
  text: string;
}

// Album's "저장한 사진" tab — permanently saved (APPROVED) received photos
// only. No TTL: an approved save never expires.
export interface SavedPhotoItem {
  id: string; // deliveryId
  photoId: string;
  peerName: string; // who sent it
  caption: string;
  photoUrl: string;
  groupName: string | null; // which GROUP it came from — null for a 1:1 friend
  sentAt: number;
  savedAt: number | null;
}

// Album's "보낸 사진" tab — one row per (photo, recipient) pair, so a sender
// can approve/reject a specific recipient's save request inline.
export interface SentPhotoItem {
  id: string; // deliveryId
  photoId: string;
  peerName: string; // recipient's name
  caption: string;
  photoUrl: string;
  sentAt: number;
  expiresAt: number;
  saveStatus: SaveRequestStatus;
  targetUserId: string;
  groupId: string | null;
  comments: CommentPreview[];
}

// A group's still-live (<24h) photo history shown in the story viewer —
// mixes photos I sent and photos I received in that group/friendship.
export interface GroupPhoto {
  photoId: string;
  photoUrl: string;
  caption: string;
  senderId: string;
  senderName: string;
  createdAt: number;
  expiresAt: number;
  isMine: boolean;
  saveStatus: SaveRequestStatus | null;
  comments: CommentPreview[];
}

// Full comment thread for one photo (see the story viewer's reactions
// sheet) — replies nest exactly one level under their parent.
export interface Comment {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: number;
  replies: Omit<Comment, 'replies'>[];
}

export type NotificationType =
  | 'friend-added'
  | 'poke'
  | 'photo-received'
  | 'photo-reaction'
  | 'photo-reply'
  | 'save-request'
  | 'group-invite'
  | 'group-member-joined';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  photoId: string | null;
  groupId: string | null;
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
