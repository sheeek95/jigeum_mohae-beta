import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const ALBUM_NAME = '지금 모해';

// expo-media-library is a native module added after some installed binaries
// may already be running (same OTA-vs-build gap as index.js's background
// task note) — every call into it here is wrapped so a binary that doesn't
// have it compiled in reports failure instead of throwing into the UI.
export async function saveToDevice(photoUrl: string): Promise<boolean> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (permission.status !== 'granted') return false;

    const downloaded = await File.downloadFileAsync(photoUrl, Paths.cache, { idempotent: true });
    try {
      const asset = await MediaLibrary.Asset.create(downloaded.uri);
      const album = await MediaLibrary.Album.get(ALBUM_NAME);
      if (album) await album.add(asset);
      else await MediaLibrary.Album.create(ALBUM_NAME, [asset]);
    } finally {
      downloaded.delete();
    }
    return true;
  } catch (err) {
    console.warn('[deviceGallery] saveToDevice failed:', err);
    return false;
  }
}
