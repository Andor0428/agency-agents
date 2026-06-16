import { Platform, TextStyle } from 'react-native';

/**
 * Stock Take design system — 2026 refresh.
 * Deep "midnight" neutral surfaces with an indigo→violet accent and an
 * emerald voice-capture accent. Keys used across the app are preserved;
 * new tokens (radii, shadows, gradients, accent variants) are additive.
 */
export const palette = {
  // Neutrals (cool midnight)
  midnight900: '#070A12',
  midnight850: '#0A0E17',
  midnight800: '#0E1320',
  midnight700: '#141A29',
  midnight600: '#1B2334',
  midnight500: '#232E42',
  line: '#26314A',
  lineStrong: '#33415E',

  white: '#F4F7FF',
  slate200: '#C3CCDE',
  slate400: '#94A1BC',
  slate500: '#6B7790',
  slate600: '#5C6884',

  indigo300: '#A5B4FC',
  indigo400: '#818CF8',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',
  violet500: '#8B5CF6',

  emerald400: '#34D399',
  emerald500: '#10B981',
  amber400: '#FBBF24',
  rose400: '#FB7185',
  rose500: '#F43F5E',
};

export const colors = {
  // Backgrounds & surfaces
  background: '#080B12',
  backgroundAlt: '#0B0F18',
  surface: '#111726',
  surfaceElevated: '#192133',
  surfaceHover: '#202B41',
  border: '#242F47',
  borderStrong: '#33415E',

  // Text
  text: '#F4F7FF',
  textMuted: '#94A1BC',
  textFaint: '#67738C',

  // Accent (indigo → violet)
  accent: '#8B95FF',
  accentStrong: '#6366F1',
  accentMuted: '#4F46E5',
  accentSoft: 'rgba(124,140,255,0.14)',
  accentBorder: 'rgba(124,140,255,0.35)',

  // Secondary / semantic
  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.14)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.13)',
  danger: '#FB7185',
  dangerSoft: 'rgba(251,113,133,0.13)',

  // Voice capture
  micActive: '#10B981',
  micIdle: '#192133',

  // Overlays
  overlay: 'rgba(5,8,14,0.72)',
  scrim: 'rgba(255,255,255,0.04)',
};

export const gradients = {
  accent: ['#6366F1', '#8B5CF6'] as const,
  accentBright: ['#818CF8', '#A78BFA'] as const,
  mic: ['#10B981', '#059669'] as const,
  surface: ['#141B2B', '#0E1320'] as const,
  hero: ['#1A2235', '#10162400'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5, fontFamily } as TextStyle,
  title: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3, fontFamily } as TextStyle,
  heading: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.2, fontFamily } as TextStyle,
  subheading: { fontSize: 16, fontWeight: '600' as const, fontFamily } as TextStyle,
  body: { fontSize: 16, fontWeight: '400' as const, fontFamily } as TextStyle,
  bodyStrong: { fontSize: 16, fontWeight: '600' as const, fontFamily } as TextStyle,
  caption: { fontSize: 13, fontWeight: '500' as const, fontFamily } as TextStyle,
  overline: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    fontFamily,
  } as TextStyle,
  largeButton: { fontSize: 17, fontWeight: '700' as const, letterSpacing: 0.2, fontFamily } as TextStyle,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  soft: {
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  glow: {
    shadowColor: '#6366F1',
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  micGlow: {
    shadowColor: '#10B981',
    shadowOpacity: 0.55,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
};

export const tapTarget = {
  minHeight: 50,
  minWidth: 50,
};
