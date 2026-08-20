import { ExtensionStorage } from '@bacons/apple-targets';

// Must match the values read by targets/widget/JigeumMohaeWidget.swift.
const APP_GROUP = 'group.com.jigeummohae.app';
const WIDGET_KIND = 'JigeumMohaeWidget';

const storage = new ExtensionStorage(APP_GROUP);

// The WidgetKit extension is a separate OS process — it can't reach our JS
// store or fetch client directly, so it re-authenticates itself against the
// backend using a token shared here. Call this whenever the token changes
// (see bootstrap() in useAppStore.ts). A safe no-op on Android/web — this
// package's ExtensionStorage falls back to no-op functions when the native
// Expo module isn't present (see @bacons/apple-targets/build/ExtensionStorage.js).
export function syncIosWidgetCredentials(token: string | null, apiBaseURL: string) {
  if (token) {
    storage.set('authToken', token);
    storage.set('apiBaseURL', apiBaseURL);
  } else {
    storage.remove('authToken');
  }
  ExtensionStorage.reloadWidget(WIDGET_KIND);
}

// Nudges WidgetKit to re-run its timeline provider now instead of waiting
// for the OS's own (≈30 min minimum) refresh schedule — the iOS equivalent
// of syncAndroidWidget.tsx's push. Called from refreshWidget() alongside it.
export function requestIosWidgetReload() {
  ExtensionStorage.reloadWidget(WIDGET_KIND);
}
