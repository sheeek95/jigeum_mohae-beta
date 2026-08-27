import React from 'react';
import type { WidgetTaskHandler, WidgetTaskHandlerProps } from 'react-native-android-widget';

import { JigeumMohaeWidget } from './JigeumMohaeWidget';
import { fetchCrossGroupLatestPhoto, fetchGroupLatestPhoto, getWidgetTarget } from './widgetTargets';

export const WIDGET_NAME = 'JigeumMohae';

export const widgetTaskHandler: WidgetTaskHandler = async (props: WidgetTaskHandlerProps) => {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  const target = await getWidgetTarget(props.widgetInfo.widgetId);
  const photo = target ? await fetchGroupLatestPhoto(target.groupId) : await fetchCrossGroupLatestPhoto();
  props.renderWidget(React.createElement(JigeumMohaeWidget, { photo, targetLabel: target?.name ?? null }));
};
