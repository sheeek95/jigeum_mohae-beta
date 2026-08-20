import React from 'react';
import { FlexWidget, ImageWidget, type ImageWidgetSource, OverlapWidget, TextWidget } from 'react-native-android-widget';

import { colors } from '../theme/tokens';

export interface WidgetPhotoData {
  url: string;
  senderName: string;
  caption: string;
  timeLabel: string;
}

interface Props {
  photo: WidgetPhotoData | null;
}

// The home-screen widget's UI, rendered through react-native-android-widget's
// RemoteViews bridge — this is NOT a regular React Native screen, it uses the
// library's own primitives (FlexWidget/TextWidget/ImageWidget) so a plain
// clickAction="OPEN_APP" / "OPEN_URI" is how taps are wired, not onPress.
// Mirrors the in-app home widget card (app/(tabs)/index.tsx) at a glance.
export function JigeumMohaeWidget({ photo }: Props) {
  return (
    <FlexWidget
      clickAction={photo ? 'OPEN_APP' : 'OPEN_URI'}
      clickActionData={photo ? undefined : { uri: 'jigeummohae://camera' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 28,
        backgroundColor: colors.surface,
        padding: 16,
        flexDirection: 'column',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 8,
        }}
      >
        <TextWidget
          text="지금 모해"
          style={{ fontSize: 12, fontWeight: '700', color: colors.textMid }}
        />
      </FlexWidget>

      {photo ? (
        <FlexWidget style={{ flex: 1, width: 'match_parent' }}>
          <OverlapWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 18, overflow: 'hidden' }}>
            <ImageWidget
              image={photo.url as ImageWidgetSource}
              imageWidth={300}
              imageHeight={300}
              resizeMode="cover"
              style={{ width: 'match_parent', height: 'match_parent' }}
            />
            <FlexWidget
              style={{
                width: 'match_parent',
                height: 'match_parent',
                justifyContent: 'flex-end',
              }}
            >
              <FlexWidget style={{ width: 'match_parent', backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: 10 }}>
                <TextWidget
                  text={`${photo.senderName} · ${photo.timeLabel}`}
                  style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}
                />
                {photo.caption ? (
                  <TextWidget
                    text={photo.caption}
                    truncate="END"
                    maxLines={1}
                    style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.85)', marginTop: 2 }}
                  />
                ) : null}
              </FlexWidget>
            </FlexWidget>
          </OverlapWidget>
        </FlexWidget>
      ) : (
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'jigeummohae://camera' }}
          style={{
            flex: 1,
            width: 'match_parent',
            borderRadius: 18,
            borderWidth: 1,
            borderColor: 'rgba(255, 214, 102, 0.45)',
            borderStyle: 'dashed',
            backgroundColor: 'rgba(255, 214, 102, 0.06)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget text="📷" style={{ fontSize: 26, marginBottom: 6 }} />
          <TextWidget
            text="기다리는 중..."
            style={{ fontSize: 13, fontWeight: '700', color: colors.yellow }}
          />
          <TextWidget
            text="탭하면 바로 촬영"
            style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
