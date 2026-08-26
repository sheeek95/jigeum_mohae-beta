import React from 'react';
import type { WidgetTaskHandler, WidgetTaskHandlerProps } from 'react-native-android-widget';

import { api, resolveMediaUrl, setAuthToken } from '../api/client';
import { getStoredSessionToken } from '../api/session';
import { JigeumMohaeWidget, type WidgetPhotoData } from './JigeumMohaeWidget';

export const WIDGET_NAME = 'JigeumMohae';

interface ApiWidgetPhotoResponse {
  photo: { url: string; caption: string; senderName: string; groupName: string | null; createdAt: string } | null;
}

// Headless JS tasks run outside the mounted React tree (the app may not even
// be open), so this can't read the zustand store — it reads the same
// persisted session token the app itself uses. It does NOT fall back to
// device-id re-auth: an account created through Kakao login has no deviceId
// at all, so that fallback would silently spin up a second, blank account
// (exactly the bug login was added to stop) rather than just having no
// photo to show this refresh.
async function fetchLatestPhoto(): Promise<WidgetPhotoData | null> {
  try {
    const token = await getStoredSessionToken();
    if (!token) return null;
    setAuthToken(token);

    const { photo } = await api.get<ApiWidgetPhotoResponse>('/photos/widget/latest');
    if (!photo) return null;
    return {
      url: resolveMediaUrl(photo.url),
      senderName: photo.senderName,
      groupName: photo.groupName,
      caption: photo.caption,
      timeLabel: new Date(photo.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return null; // offline or backend unreachable — fall back to "기다리는 중..."
  }
}

export const widgetTaskHandler: WidgetTaskHandler = async (props: WidgetTaskHandlerProps) => {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  const photo = await fetchLatestPhoto();
  props.renderWidget(React.createElement(JigeumMohaeWidget, { photo }));
};
