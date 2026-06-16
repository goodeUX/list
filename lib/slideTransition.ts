import { Dimensions, Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

export const CONTENT_MAX_WIDTH = 430;
export const SLIDE_IN_MS = 420;
export const SLIDE_OUT_MS = 420;
export const SLIDE_IN_EASING = Easing.bezier(0.16, 1, 0.3, 1);
export const SLIDE_OUT_EASING = SLIDE_IN_EASING;
export const PUSH_PARALLAX_RATIO = 1 / 3;

export function isSlideTransitionEnabled(): boolean {
  return true;
}

export function getSlideDistance(): number {
  const windowWidth = Dimensions.get('window').width;

  if (Platform.OS === 'web') {
    return Math.min(windowWidth, CONTENT_MAX_WIDTH);
  }

  return windowWidth;
}
