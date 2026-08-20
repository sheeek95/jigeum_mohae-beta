import { requestWidgetUpdate } from 'react-native-android-widget';

import { JigeumMohaeWidget, type WidgetPhotoData } from './JigeumMohaeWidget';
import { WIDGET_NAME } from './widget-task-handler';

// Pushes the widget's current state to any placed home-screen widget
// instance right away. Native updatePeriodMillis has an OS-enforced 30-minute
// floor, so this JS-triggered push (called after the app's own poll picks up
// a new photo) is what makes the widget feel close to real-time while the
// app is running — see `refreshWidget` in useAppStore.ts. A safe no-op on
// iOS/web (react-native-android-widget's AndroidWidget.ts).
export async function syncAndroidWidget(photo: WidgetPhotoData | null) {
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: () => <JigeumMohaeWidget photo={photo} />,
  });
}
