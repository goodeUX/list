import type { ViewStyle } from 'react-native';

/**
 * Replacement for `StyleSheet.absoluteFillObject`, which was removed in
 * React Native 0.86 (Expo SDK 57). Spread this into a style to fill the parent.
 */
export const absoluteFill: ViewStyle = {
  bottom: 0,
  left: 0,
  position: 'absolute',
  right: 0,
  top: 0,
};
