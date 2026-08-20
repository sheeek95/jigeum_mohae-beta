import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widgets/widget-task-handler';

// Registers the Android home-screen widget's headless update handler.
// react-native-web has no AppRegistry.registerHeadlessTask (it's a native-only
// RN API), so this is guarded rather than relying on the library's own
// (native-module-level, not AppRegistry-level) web no-ops.
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}
