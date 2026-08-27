import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GhostButton, PrimaryButton } from '../src/components/Buttons';
import { useScreenCaptureBlock } from '../src/hooks/useScreenCaptureBlock';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/tokens';
import { base64ToBytes } from '../src/utils/base64';

// A real (if tiny) 1x1 PNG, used only when there's no camera to shoot with —
// keeps the rest of the pipeline (preview, upload, server-side image
// handling) exercising a genuine image file instead of a fake one.
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function writeDemoPhoto(): string {
  const file = new File(Paths.cache, `demo-${Date.now()}.png`);
  file.write(base64ToBytes(PLACEHOLDER_PNG_BASE64));
  return file.uri;
}

export default function CameraScreen() {
  useScreenCaptureBlock();
  const { presetGroupId } = useLocalSearchParams<{ presetGroupId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const flash = useRef(new Animated.Value(0)).current;
  const setCapturedPhoto = useAppStore((s) => s.setCapturedPhoto);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  function flashScreen() {
    flash.setValue(0);
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }

  async function takePhoto() {
    flashScreen();
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      setTimeout(() => setPhotoUri(photo?.uri ?? writeDemoPhoto()), 180);
    } catch {
      setTimeout(() => setPhotoUri(writeDemoPhoto()), 180);
    }
  }

  function retake() {
    setPhotoUri(null);
  }

  // Opened directly from the widget (jigeummohae://camera) this screen is
  // often the first thing on the stack — router.back() is then a no-op, so
  // fall back to the home tab instead of leaving the X button dead.
  function closeCamera() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  function confirmAndShare() {
    if (!photoUri) return;
    setCapturedPhoto({ uri: photoUri, takenAt: Date.now() });
    router.replace(presetGroupId ? { pathname: '/share', params: { presetGroupId } } : '/share');
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.permissionWrap}>
          <Ionicons name="camera-outline" size={40} color={colors.textMid} />
          <Text style={styles.permissionTitle}>카메라 권한이 필요해요</Text>
          <Text style={styles.permissionSub}>친구에게 지금 이 순간을 사진으로 보내려면 카메라 접근을 허용해주세요.</Text>
          <View style={styles.permissionActions}>
            <GhostButton onPress={closeCamera} style={{ flex: 1 }}>닫기</GhostButton>
            <PrimaryButton onPress={requestPermission} style={{ flex: 1 }}>권한 허용</PrimaryButton>
          </View>
          <Pressable onPress={() => setPhotoUri(writeDemoPhoto())} hitSlop={8}>
            <Text style={styles.demoLink}>카메라 없이 데모로 계속하기</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          <SafeAreaView style={styles.headerRow} edges={['top']}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>지금 이 순간을 공유해보세요</Text>
            </View>
            <Pressable style={styles.pillTouchable} onPress={closeCamera}>
              <Text style={styles.pillText}>✕</Text>
            </Pressable>
          </SafeAreaView>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flashOverlay, { opacity: flash }]} />
          <SafeAreaView style={styles.footerRow} edges={['bottom']}>
            <Pressable style={styles.shutter} onPress={takePhoto} />
          </SafeAreaView>
        </>
      ) : (
        <View style={styles.previewWrap}>
          <Image source={{ uri: photoUri }} style={styles.previewPhoto} contentFit="cover" />
          <SafeAreaView edges={['bottom']} style={styles.previewActions}>
            <GhostButton onPress={retake} style={{ flex: 1 }}>다시 찍기</GhostButton>
            <PrimaryButton onPress={confirmAndShare} style={{ flex: 1 }}>확인 · 공유하기</PrimaryButton>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0714' },
  headerRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  pill: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillTouchable: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { color: '#fff', fontSize: 11, fontFamily: 'SCDream-Medium' },
  flashOverlay: { backgroundColor: '#fff' },
  footerRow: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 20 },
  shutter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  previewWrap: { flex: 1 },
  previewPhoto: { flex: 1, backgroundColor: '#3A2761' },
  previewActions: { flexDirection: 'row', gap: 12, padding: 18, backgroundColor: '#0A0714' },
  permissionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 6 },
  permissionTitle: { color: colors.textHi, fontSize: 16, fontFamily: 'SCDream-ExtraBold', marginTop: 12 },
  permissionSub: { color: colors.textDim, fontSize: 12.5, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  permissionActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 20 },
  demoLink: { color: colors.textDim, fontSize: 11.5, marginTop: 18, textDecorationLine: 'underline' },
});
