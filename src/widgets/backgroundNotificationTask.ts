import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { syncAndroidWidget } from './syncAndroidWidget';
import { requestIosWidgetReload } from './syncIosWidget';

const BACKGROUND_NOTIFICATION_TASK = 'jigeum-mohae-background-notification';

// Refreshes the home-screen widget(s) whenever a push arrives while the app
// is backgrounded or fully closed, so a friend's photo shows up there
// without the user having to open the app first — until now that only
// happened once the app was opened (refreshAll() in useAppStore.ts).
//
// Android: fairly reliable, since expo-task-manager headlessly relaunches
// the JS engine on FCM receipt even with the app killed. iOS: best-effort —
// Apple throttles and makes no timing guarantee for background remote
// notifications (see registerTaskAsync's own docs: "send no more than two
// or three per hour"), so this can land anywhere from instantly to not at
// all before the OS's own ~30min widget refresh window catches up anyway.
//
// Doesn't need to look at the notification payload at all: syncAndroidWidget
// re-fetches each placed widget's own configured target itself, and
// requestIosWidgetReload just asks WidgetKit to re-run its own
// (self-authenticating) timeline provider.
//
// Must run at module scope in a file required early (per expo-notifications'
// own docs) — imported for its side effect from index.js, same as the
// Android widget task handler's registration.
if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
    if (Platform.OS === 'android') {
      await syncAndroidWidget().catch(() => {});
    } else {
      requestIosWidgetReload();
    }
    return Notifications.BackgroundNotificationTaskResult.NewData;
  });

  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(() => {});
}
