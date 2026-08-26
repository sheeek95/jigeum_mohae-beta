import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY = 'jigeum-mohae-device-id';

// AsyncStorage is the source of truth here, not SecureStore. A device id
// isn't secret (it's just a random identifier for our own backend), and
// Expo's own docs warn SecureStore "should not be considered completely
// reliable ... across app updates" on Android: its Keystore-backed value
// can silently fail to decrypt, and getItemAsync then returns null instead
// of throwing. The old SecureStore-primary version of this function treated
// that null as "no id yet" and minted a brand-new one — which silently
// spawned a new backend account (reset name, new invite code) on affected
// updates. SecureStore is still checked as a one-time migration path for
// any device where that value happens to still be intact.
export async function getOrCreateDeviceId(): Promise<string> {
  const fromAsync = await AsyncStorage.getItem(KEY).catch(() => null);
  if (fromAsync) return fromAsync;

  const fromSecure = await SecureStore.getItemAsync(KEY).catch(() => null);
  if (fromSecure) {
    await AsyncStorage.setItem(KEY, fromSecure).catch(() => {});
    return fromSecure;
  }

  const created = Crypto.randomUUID();
  await AsyncStorage.setItem(KEY, created).catch(() => {});
  await SecureStore.setItemAsync(KEY, created).catch(() => {});
  return created;
}
