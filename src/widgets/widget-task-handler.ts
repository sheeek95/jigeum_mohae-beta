import React from 'react';
import type { WidgetTaskHandler, WidgetTaskHandlerProps } from 'react-native-android-widget';

import { api, resolveMediaUrl, setAuthToken } from '../api/client';
import { getOrCreateDeviceId } from '../api/identity';
import { JigeumMohaeWidget, type WidgetPhotoData } from './JigeumMohaeWidget';

export const WIDGET_NAME = 'JigeumMohae';

interface ApiUserResponse {
  token: string;
  user: { id: string };
}

interface ApiWidgetPhotoResponse {
  photo: { url: string; caption: string; senderName: string; createdAt: string } | null;
}

// Headless JS tasks run outside the mounted React tree (the app may not even
// be open), so this can't read the zustand store — it re-authenticates with
// the same persisted device id the app itself uses, independently.
async function fetchLatestPhoto(): Promise<WidgetPhotoData | null> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { token } = await api.post<ApiUserResponse>('/auth/device', { deviceId });
    setAuthToken(token);

    const { photo } = await api.get<ApiWidgetPhotoResponse>('/photos/widget/latest');
    if (!photo) return null;
    return {
      url: resolveMediaUrl(photo.url),
      senderName: photo.senderName,
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
