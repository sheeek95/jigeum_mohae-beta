export interface ApiUser {
  id: string;
  deviceId: string;
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
  expiresAt: string;
}

export interface ApiInvitePreview {
  code: string;
  expiresAt: string;
  valid: boolean;
  isSelf: boolean;
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

export interface ApiReceivedPhoto {
  deliveryId: string;
  photoId: string;
  url: string;
  caption: string;
  senderName: string;
  createdAt: string;
  expiresAt: string;
  saveStatus: ApiSaveStatus;
}

export interface ApiSentDelivery {
  deliveryId: string;
  userId: string;
  displayName: string;
  saveStatus: ApiSaveStatus;
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
}
