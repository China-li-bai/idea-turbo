import { Platform } from 'react-native'

export const colors = {
  primary: {
    50: '#F0F7FF',
    100: '#E0EFFF',
    200: '#B8D9FF',
    300: '#85C1FF',
    400: '#52A8FF',
    500: '#2B8DFE',
    600: '#1A6FDB',
    700: '#1557B0',
    800: '#16458E',
    900: '#173A75',
  },
  secondary: {
    50: '#FFF8F0',
    100: '#FFEFD6',
    200: '#FFDBA8',
    300: '#FFC26A',
    400: '#FFA82E',
    500: '#F5930A',
    600: '#D97806',
    700: '#B55D08',
    800: '#92490F',
    900: '#783D12',
  },
  accent: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  warm: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.45)',
}

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
}

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.primary[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 0,
  },
}

export const animation = {
  durations: {
    fast: 150,
    normal: 300,
    slow: 500,
    bounce: 600,
  },
  easing: {
    default: Platform.OS === 'ios' ? 'easeInOut' : 'ease',
    spring: { damping: 15, stiffness: 150, mass: 0.8 },
    bouncy: { damping: 10, stiffness: 200, mass: 0.6 },
    gentle: { damping: 20, stiffness: 100, mass: 1 },
    wobble: { damping: 8, stiffness: 300, mass: 0.5 },
  },
}

export const petTheme = {
  cat: {
    primary: colors.rose[500],
    primaryLight: colors.rose[100],
    primaryDark: colors.rose[700],
    accent: colors.warm[400],
    bg: '#FFF5F5',
    gradient: ['#FFE4E6', '#FFF1F2'] as const,
    emoji: '🐱',
    personality: '傲娇又温柔',
  },
  dog: {
    primary: colors.secondary[500],
    primaryLight: colors.secondary[100],
    primaryDark: colors.secondary[700],
    accent: colors.warm[500],
    bg: '#FFF8F0',
    gradient: ['#FFEFD6', '#FFF8F0'] as const,
    emoji: '🐕',
    personality: '忠诚热情',
  },
  bird: {
    primary: colors.primary[500],
    primaryLight: colors.primary[100],
    primaryDark: colors.primary[700],
    accent: colors.accent[400],
    bg: '#F0F7FF',
    gradient: ['#E0EFFF', '#F0F7FF'] as const,
    emoji: '🐦',
    personality: '活泼好奇',
  },
  rabbit: {
    primary: colors.rose[400],
    primaryLight: colors.rose[50],
    primaryDark: colors.rose[600],
    accent: colors.warm[300],
    bg: '#FFF0F3',
    gradient: ['#FFE4EA', '#FFF0F3'] as const,
    emoji: '🐰',
    personality: '软萌害羞',
  },
  hamster: {
    primary: colors.warm[500],
    primaryLight: colors.warm[100],
    primaryDark: colors.warm[700],
    accent: colors.secondary[400],
    bg: '#FFFBEB',
    gradient: ['#FEF3C7', '#FFFBEB'] as const,
    emoji: '🐹',
    personality: '圆滚滚吃货',
  },
  fox: {
    primary: colors.secondary[600],
    primaryLight: colors.secondary[100],
    primaryDark: colors.secondary[800],
    accent: colors.rose[400],
    bg: '#FFF7ED',
    gradient: ['#FFEDD5', '#FFF7ED'] as const,
    emoji: '🦊',
    personality: '聪明狡黠',
  },
  axolotl: {
    primary: colors.accent[500],
    primaryLight: colors.accent[100],
    primaryDark: colors.accent[700],
    accent: colors.primary[400],
    bg: '#F0FDF4',
    gradient: ['#DCFCE7', '#F0FDF4'] as const,
    emoji: '🦎',
    personality: '神秘治愈',
  },
}

export type PetThemeKey = keyof typeof petTheme

export const chatBubble = {
  user: {
    bg: colors.primary[500],
    text: colors.white,
    borderBottomRadius: 4,
  },
  pet: {
    bg: colors.white,
    text: colors.neutral[900],
    border: colors.neutral[200],
    borderBottomRadius: 4,
  },
  system: {
    bg: colors.warm[50],
    text: colors.warm[600],
    border: colors.warm[200],
  },
}

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  animation,
  chatBubble,
  petTheme,
}

export type Theme = typeof theme
