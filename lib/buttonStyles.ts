import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { radius, fontFamily } from '@/lib/design';

export const BUTTON_HORIZONTAL_PADDING = Platform.OS === 'android' ? 20 : 16;

/**
 * Squircle corner for every button in the product. borderCurve smooths the
 * corner into a continuous curve on iOS; Android has no equivalent and falls
 * back to a plain rounded rect at the same radius.
 */
export const BUTTON_BORDER_RADIUS = radius.md; // 14 — rounder, playful

export const buttonLayoutStyle: ViewStyle = {
  alignItems: 'center',
  borderCurve: 'continuous',
  borderRadius: BUTTON_BORDER_RADIUS,
  justifyContent: 'center',
  paddingHorizontal: BUTTON_HORIZONTAL_PADDING,
  paddingVertical: 4,
};

export function buttonLabelStyle(fontSize: number): TextStyle {
  return {
    fontFamily: fontFamily.bodySemiBold,
    fontSize,
    lineHeight: Math.round(fontSize * 1.5),
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  };
}
