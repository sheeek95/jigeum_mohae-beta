import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'jigeum-mohae-session-token';

// The actual JWT (365-day expiry), not just a device id — once a Kakao
// login succeeds, every later launch just reads this back instead of
// re-authenticating, so there's nothing left that can silently mint a new
// account. AsyncStorage, not SecureStore: see identity.ts for why.
export async function getStoredSessionToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEY).catch(() => null);
}

export async function setStoredSessionToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEY, token).catch(() => {});
}

export async function clearStoredSessionToken(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
