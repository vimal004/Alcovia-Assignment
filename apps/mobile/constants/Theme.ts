import { useColorScheme as useDeviceColorScheme } from 'react-native';

export const M3Colors = {
  light: {
    primary: '#6750A4',
    onPrimary: '#FFFFFF',
    primaryContainer: '#EADDFF',
    onPrimaryContainer: '#21005D',
    secondary: '#625B71',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E8DEF8',
    onSecondaryContainer: '#1D192B',
    tertiary: '#7D5260',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFD8E4',
    onTertiaryContainer: '#31111D',
    error: '#B3261E',
    onError: '#FFFFFF',
    errorContainer: '#F9DEDC',
    onErrorContainer: '#410E0B',
    background: '#FEF7FF',
    onBackground: '#1D1B20',
    surface: '#FFFFFF',
    onSurface: '#1D1B20',
    surfaceVariant: '#E7E0EC',
    onSurfaceVariant: '#49454F',
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#D0BCFF',
    // Custom semantic colors for study app
    success: '#2E7D32',
    onSuccess: '#FFFFFF',
    successContainer: '#E8F5E9',
    warning: '#EF6C00',
    warningContainer: '#FFF3E0',
    info: '#0288D1',
    infoContainer: '#E1F5FE',
  },
  dark: {
    primary: '#D0BCFF',
    onPrimary: '#381E72',
    primaryContainer: '#4F378B',
    onPrimaryContainer: '#EADDFF',
    secondary: '#CCC2DC',
    onSecondary: '#332D41',
    secondaryContainer: '#4A4458',
    onSecondaryContainer: '#E8DEF8',
    tertiary: '#EFB8C8',
    onTertiary: '#492532',
    tertiaryContainer: '#633B48',
    onTertiaryContainer: '#FFD8E4',
    error: '#F2B8B5',
    onError: '#601410',
    errorContainer: '#8C1D18',
    onErrorContainer: '#F9DEDC',
    background: '#141218',
    onBackground: '#E6E1E5',
    surface: '#1D1B20',
    onSurface: '#E6E1E5',
    surfaceVariant: '#49454F',
    onSurfaceVariant: '#CAC4D0',
    outline: '#938F99',
    outlineVariant: '#49454F',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#E6E1E5',
    inverseOnSurface: '#313033',
    inversePrimary: '#6750A4',
    // Custom semantic colors
    success: '#81C784',
    onSuccess: '#1B5E20',
    successContainer: '#1B5E2033',
    warning: '#FFB74D',
    warningContainer: '#E6510033',
    info: '#4FC3F7',
    infoContainer: '#01579B33',
  },
};

export const M3Shapes = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 28,
  full: 9999,
};

export const M3Typography = {
  displayLarge: {
    fontSize: 40,
    fontWeight: '300' as const,
    letterSpacing: -0.5,
    lineHeight: 48,
  },
  displayMedium: {
    fontSize: 32,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 40,
  },
  headlineLarge: {
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 36,
  },
  headlineMedium: {
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 32,
  },
  titleLarge: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: 0,
    lineHeight: 26,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.15,
    lineHeight: 22,
  },
  titleSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
  },
  labelLarge: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
};

export function useM3Theme() {
  const deviceColorScheme = useDeviceColorScheme();
  const isDark = deviceColorScheme === 'dark';
  const colors = isDark ? M3Colors.dark : M3Colors.light;

  return {
    colors,
    isDark,
    shapes: M3Shapes,
    typography: M3Typography,
  };
}
