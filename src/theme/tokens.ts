// Color/spacing tokens ported from the jigeummohae.html mockup's CSS custom properties.
export const colors = {
  bgVoid: '#120C24',
  bgDeep: '#1C1338',
  bgDeep2: '#2A1D4D',
  surface: '#271A47',
  surfaceHi: '#33234F',
  coral: '#FF6F81',
  coralDim: '#7A3D48',
  coralText: '#2A0E14',
  yellow: '#FFD666',
  yellowText: '#231600',
  textHi: '#F7F3FF',
  textMid: '#C4B8E6',
  textDim: '#8577AB',
  line: 'rgba(247,243,255,0.08)',
  white: '#FFFFFF',
} as const;

export const gradients = {
  screenBg: ['#241A47', '#170F2C', '#0F0A1F'] as const,
  photoPlaceholder: ['#5B3E86', '#3A2761'] as const,
  photoPlaceholderAlt: ['#6B4B96', '#2C1E4A'] as const,
  logo: ['#FF6F81', '#6B3D8C'] as const,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 20,
  xxl: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const fontSize = {
  xs: 10.5,
  sm: 11.5,
  base: 13,
  md: 14.5,
  lg: 16,
  xl: 21,
  display: 38,
};

// 에스코어드림(S-Core Dream) — loaded via useFonts in app/_layout.tsx, and
// set as the app-wide Text/TextInput default there. Only bundle the weights
// the app actually uses (fontWeight: '600'|'700'|'800' plus the implicit
// default '400') — every other Text just inherits SCDreamRegular.
export const fonts = {
  regular: 'SCDream-Regular',
  medium: 'SCDream-Medium',
  bold: 'SCDream-Bold',
  extraBold: 'SCDream-ExtraBold',
} as const;
