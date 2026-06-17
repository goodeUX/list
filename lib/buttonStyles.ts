import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const BUTTON_HORIZONTAL_PADDING = Platform.OS === 'android' ? 20 : 16;

export const buttonLayoutStyle: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: BUTTON_HORIZONTAL_PADDING,
  paddingVertical: 4,
};

export function buttonLabelStyle(fontSize: number): TextStyle {
  return {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize,
    lineHeight: Math.round(fontSize * 1.5),
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  };
}
