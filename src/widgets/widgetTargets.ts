import AsyncStorage from '@react-native-async-storage/async-storage';

import { api, resolveMediaUrl, setAuthToken } from '../api/client';
import { getStoredSessionToken } from '../api/session';
import type { WidgetPhotoData } from './JigeumMohaeWidget';

// Self-sufficient (no zustand store) — shared by the headless widget task
// handler, the app-triggered sync push, and the widget configuration
// screen, none of which can rely on the app's normal store singleton being
// mounted (a widget's process/JS context may be separate from the running
// app's, same reasoning as widget-task-handler.ts's original fetch).
async function ensureAuthed(): Promise<boolean> {
  const token = await getStoredSessionToken();
  if (!token) return false;
  setAuthToken(token);
  return true;
}

export interface WidgetTarget {
  id: string;
  name: string;
  kind: 'GROUP' | 'PERSONAL';
}

export async function fetchMyGroups(): Promise<WidgetTarget[]> {
  if (!(await ensureAuthed())) return [];
  try {
    const { groups } = await api.get<{ groups: WidgetTarget[] }>('/groups');
    return groups;
  } catch {
    return [];
  }
}

interface ApiGroupPhotoItem {
  url: string;
  caption: string;
  senderName: string;
  createdAt: string;
  isMine: boolean;
}

// A specific group/friend's most recently RECEIVED (never my own sent)
// live photo — matches the original cross-group widget's semantics, just
// scoped to one target instead of "whatever's newest anywhere".
export async function fetchGroupLatestPhoto(groupId: string): Promise<WidgetPhotoData | null> {
  if (!(await ensureAuthed())) return null;
  try {
    const { items } = await api.get<{ items: ApiGroupPhotoItem[] }>(`/groups/${groupId}/photos`);
    const received = items.filter((p) => !p.isMine);
    const latest = received[received.length - 1]; // oldest-first from the server
    if (!latest) return null;
    return {
      url: resolveMediaUrl(latest.url),
      senderName: latest.senderName,
      groupName: null, // the widget's persistent header label covers this now
      caption: latest.caption,
      timeLabel: new Date(latest.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return null;
  }
}

interface ApiWidgetLatestResponse {
  photo: { url: string; caption: string; senderName: string; groupName: string | null; createdAt: string } | null;
}

// The original cross-group "whatever's newest anywhere" fetch — kept as the
// fallback for a widget instance nobody's explicitly configured yet (the
// config screen is skippable — app.json declares "configuration_optional"
// — and for anyone who placed the widget before per-group selection existed).
export async function fetchCrossGroupLatestPhoto(): Promise<WidgetPhotoData | null> {
  if (!(await ensureAuthed())) return null;
  try {
    const { photo } = await api.get<ApiWidgetLatestResponse>('/photos/widget/latest');
    if (!photo) return null;
    return {
      url: resolveMediaUrl(photo.url),
      senderName: photo.senderName,
      groupName: photo.groupName,
      caption: photo.caption,
      timeLabel: new Date(photo.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return null;
  }
}

interface StoredWidgetTarget {
  groupId: string;
  name: string;
}

function storageKey(widgetId: number): string {
  return `widget-target:${widgetId}`;
}

// null means "not configured yet" or explicitly set back to cross-group.
export async function getWidgetTarget(widgetId: number): Promise<StoredWidgetTarget | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(widgetId));
    return raw ? (JSON.parse(raw) as StoredWidgetTarget) : null;
  } catch {
    return null;
  }
}

export async function setWidgetTarget(widgetId: number, target: StoredWidgetTarget | null): Promise<void> {
  try {
    if (target) await AsyncStorage.setItem(storageKey(widgetId), JSON.stringify(target));
    else await AsyncStorage.removeItem(storageKey(widgetId));
  } catch {
    // best-effort — worst case the widget just falls back to cross-group
  }
}
