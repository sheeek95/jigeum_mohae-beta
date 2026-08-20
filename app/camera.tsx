import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GhostButton, PrimaryButton } from '../src/components/Buttons';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/tokens';

const DEMO_PHOTO = 'demo';
const CAPTURE_GRADIENT = ['#6B4B96', '#2C1E4A'] as const;

export default function CameraScreen() {
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
      setTimeout(() => setPhotoUri(photo?.uri ?? DEMO_PHOTO), 180);
    } catch {
      setTimeout(() => setPhotoUri(DEMO_PHOTO), 180);
    }
  }

  function retake() {
    setPhotoUri(null);
  }

  function confirmAndShare() {
    setCapturedPhoto({ takenAt: Date.now(), gradient: CAPTURE_GRADIENT });
    router.replace('/share');
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
            <GhostButton onPress={() => router.back()}>닫기</GhostButton>
            <PrimaryButton onPress={requestPermission}>권한 허용</PrimaryButton>
          </View>
          <Pressable onPress={() => setPhotoUri(DEMO_PHOTO)} hitSlop={8}>
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
              <Text style={styles.pillText}>민지가 기다리는 중</Text>
            </View>
            <Pressable style={styles.pillTouchable} onPress={() => router.back()}>
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
          {photoUri === DEMO_PHOTO ? (
            <View style={[styles.previewPhoto, { backgroundColor: '#3A2761' }]} />
          ) : (
            <Image source={{ uri: photoUri }} style={styles.previewPhoto} contentFit="cover" />
          )}
          <SafeAreaView edges={['bottom']} style={styles.previewActions}>
            <GhostButton onPress={retake}>다시 찍기</GhostButton>
            <PrimaryButton onPress={confirmAndShare}>확인 · 공유하기</PrimaryButton>
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
  pillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
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
  previewPhoto: { flex: 1 },
  previewActions: { flexDirection: 'row', gap: 12, padding: 18, backgroundColor: '#0A0714' },
  permissionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 6 },
  permissionTitle: { color: colors.textHi, fontSize: 16, fontWeight: '800', marginTop: 12 },
  permissionSub: { color: colors.textDim, fontSize: 12.5, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  permissionActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 20 },
  demoLink: { color: colors.textDim, fontSize: 11.5, marginTop: 18, textDecorationLine: 'underline' },
});
