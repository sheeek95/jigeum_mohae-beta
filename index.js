import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';

// src/widgets/backgroundNotificationTask.ts (which refreshes widgets on a
// background push) is intentionally NOT imported here yet — it needs
// expo-task-manager, a native module this app's runtimeVersion policy
// ("sdkVersion") wouldn't stop an OTA update from shipping to the
// currently-installed binary even though that binary doesn't have it
// compiled in (same trap as db6eaa8/c1147313's push-notifications rollout).
// Wire it in once a fresh EAS Build with the new native module is
// confirmed installed — see that file's own comment for what it does.
import { WidgetConfigScreen } from './src/widgets/WidgetConfigScreen';
import { widgetTaskHandler } from './src/widgets/widget-task-handler';

// Registers the Android home-screen widget's headless update handler and its
// per-instance configuration screen (shown on first placement, and again via
// long-press → widget settings, since app.json declares "reconfigurable").
// react-native-web has no AppRegistry.registerHeadlessTask (it's a native-only
// RN API), so this is guarded rather than relying on the library's own
// (native-module-level, not AppRegistry-level) web no-ops.
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
  registerWidgetConfigurationScreen(WidgetConfigScreen);
}
