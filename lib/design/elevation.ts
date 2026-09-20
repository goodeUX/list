import { Platform, type ViewStyle } from 'react-native';

function shadow(height: number, radius: number, opacity: number, androidElevation: number): ViewStyle {
  return {
    shadowColor: '#2B2018',
    shadowOffset: { width: 0, height },
    shadowRadius: radius,
    shadowOpacity: opacity,
    ...(Platform.OS === 'android' ? { elevation: androidElevation } : null),
  };
}

export const elevation = {
  e1: shadow(1, 3, 0.06, 1),
  e2: shadow(4, 12, 0.1, 4),
  e3: shadow(12, 28, 0.16, 12),
} as const;

export type ElevationToken = keyof typeof elevation;
