import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';

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
