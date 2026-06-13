export const colors = {
  light: {
    bg: '#FAF7F2',
    surface: '#FFFFFF',
    surfaceMuted: '#F3EDE4',
    text: '#2C2417',
    textSecondary: '#6B5E4F',
    accent: '#C4785A',
    accentSoft: '#E8D5C4',
    success: '#5A8F6B',
    border: '#E5DDD0',
  },
  dark: {
    bg: '#1A1612',
    surface: '#252019',
    surfaceMuted: '#2E2820',
    text: '#F5F0E8',
    textSecondary: '#A89B8C',
    accent: '#D4917A',
    accentSoft: '#3D3228',
    success: '#7DB88E',
    border: '#3D352C',
  },
} as const;

export const radii = { card: 18, item: 14, checkbox: 7, fab: 18 } as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeColors = (typeof colors)[ColorScheme];
