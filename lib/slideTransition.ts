import { Dimensions, Platform } from 'react-native';

export const CONTENT_MAX_WIDTH = 430;
export const SLIDE_IN_MS = 300;
export const SLIDE_OUT_MS = 260;
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
