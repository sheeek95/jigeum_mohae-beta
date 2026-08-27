export interface ApiUser {
  id: string;
  deviceId: string | null;
  kakaoId: string | null;
  displayName: string;
  avatarStart: string;
  avatarEnd: string;
  createdAt: string;
}

export interface ApiFriend {
  id: string;
  displayName: string;
  avatarStart: string;
  avatarEnd: string;
  dnd: boolean;
  friendsSince: string;
}

export type ApiGroupKind = 'GROUP' | 'PERSONAL';

export interface ApiGroup {
  id: string;
  name: string;
  kind: ApiGroupKind;
  memberCount: number;
  dnd: boolean;
  friendId: string | null;
  members?: { id: string; displayName: string }[];
}

export interface ApiInvite {
  code: string;
}

export interface ApiInvitePreview {
  code: string;
  valid: boolean;
  isSelf: boolean;
  alreadyFriends: boolean;
  inviter: { id: string; displayName: string; avatarStart: string; avatarEnd: string };
}

export interface ApiDnd {
  enabled: boolean;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
}

export type ApiSaveStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApiWidgetPhoto {
  id: string;
  url: string;
  caption: string;
  senderName: string;
  groupName: string | null;
  createdAt: string;
}

// Album's "저장한 사진" tab — only ever APPROVED saves, so no TTL fields.
export interface ApiReceivedPhoto {
  deliveryId: string;
  photoId: string;
  url: string;
  caption: string;
  senderName: string;
  createdAt: string;
  savedAt: string | null;
}

export interface ApiSentDelivery {
  deliveryId: string;
  userId: string;
  displayName: string;
  saveStatus: ApiSaveStatus;
}

// Lightweight top-level-only preview used by the sent/group-photos list
// endpoints — the full thread (with replies) is a separate fetch, see
// ApiComment below.
export interface ApiCommentPreview {
  userId: string;
  displayName: string;
  text: string;
}

export interface ApiSentPhoto {
  photoId: string;
  url: string;
  caption: string;
  groupId: string | null;
  targetName: string;
  createdAt: string;
  expiresAt: string;
  deliveries: ApiSentDelivery[];
  comments: ApiCommentPreview[];
}

export interface ApiComment {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
  replies: Omit<ApiComment, 'replies'>[];
}

// A group's still-live (<24h) photo history for the story viewer — see
// GET /groups/:id/photos.
export interface ApiGroupPhoto {
  photoId: string;
  url: string;
  caption: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  expiresAt: string;
  isMine: boolean;
  saveStatus: ApiSaveStatus | null;
  comments: ApiCommentPreview[];
}

export type ApiNotificationType =
  | 'FRIEND_ADDED'
  | 'POKE'
  | 'PHOTO_RECEIVED'
  | 'PHOTO_REACTION'
  | 'PHOTO_REPLY'
  | 'SAVE_REQUEST';

export interface ApiNotification {
  id: string;
  type: ApiNotificationType;
  title: string;
  body: string;
  photoId: string | null;
  fromUserName: string | null;
  read: boolean;
  createdAt: string;
}
