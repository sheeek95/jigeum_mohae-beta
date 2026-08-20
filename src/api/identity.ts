import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY = 'jigeum-mohae-device-id';

// expo-secure-store's web target quietly falls back to localStorage (with a
// console warning that it isn't actually secure) rather than throwing, but we
// still guard with AsyncStorage in case a given runtime doesn't support it.
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(KEY);
    if (existing) return existing;
    const created = Crypto.randomUUID();
    await SecureStore.setItemAsync(KEY, created);
    return created;
  } catch {
    const existing = await AsyncStorage.getItem(KEY);
    if (existing) return existing;
    const created = Crypto.randomUUID();
    await AsyncStorage.setItem(KEY, created);
    return created;
  }
}
