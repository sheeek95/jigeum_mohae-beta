import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'jigeum-mohae-api-url';
const DEFAULT_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

// Lets the backend URL be changed from the Settings screen without a full
// app rebuild — EXPO_PUBLIC_API_URL is baked in at build time, so a beta APK
// would otherwise be stuck pointing at whatever server existed when it was
// built. This override (persisted in AsyncStorage) takes priority over it.
let currentUrl = DEFAULT_URL;

export function getApiUrl(): string {
  return currentUrl;
}

export async function loadStoredApiUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) currentUrl = stored;
  } catch {
    // AsyncStorage unavailable — fall back to the build-time default
  }
  return currentUrl;
}

export async function setApiUrl(url: string): Promise<void> {
  currentUrl = url.trim().replace(/\/+$/, '');
  try {
    await AsyncStorage.setItem(STORAGE_KEY, currentUrl);
  } catch {
    // best-effort persistence — the in-memory value is still updated
  }
}
