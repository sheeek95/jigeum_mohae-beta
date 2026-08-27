import { getWidgetInfo, requestWidgetUpdateById } from 'react-native-android-widget';

import { JigeumMohaeWidget } from './JigeumMohaeWidget';
import { fetchCrossGroupLatestPhoto, fetchGroupLatestPhoto, getWidgetTarget } from './widgetTargets';
import { WIDGET_NAME } from './widget-task-handler';

// Pushes fresh data to every placed home-screen widget instance right away.
// Native updatePeriodMillis has an OS-enforced 30-minute floor, so this
// JS-triggered push (called after the app's own poll picks up a new photo)
// is what makes the widget feel close to real-time while the app is
// running — see `refreshWidget` in useAppStore.ts. Each instance can be
// configured to a different group/friend (see WidgetConfigScreen.tsx), so
// this fetches and renders each one separately rather than broadcasting one
// shared photo. A safe no-op on iOS/web (react-native-android-widget's
// AndroidWidget.ts already no-ops getWidgetInfo there).
export async function syncAndroidWidget() {
  const widgets = await getWidgetInfo(WIDGET_NAME);
  await Promise.all(
    widgets.map(async ({ widgetId }) => {
      const target = await getWidgetTarget(widgetId);
      const photo = target ? await fetchGroupLatestPhoto(target.groupId) : await fetchCrossGroupLatestPhoto();
      await requestWidgetUpdateById({
        widgetName: WIDGET_NAME,
        widgetId,
        renderWidget: () => <JigeumMohaeWidget photo={photo} targetLabel={target?.name ?? null} />,
      });
    })
  );
}
