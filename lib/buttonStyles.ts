import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const BUTTON_HORIZONTAL_PADDING = 16;

export const buttonLayoutStyle: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'visible',
  paddingHorizontal: BUTTON_HORIZONTAL_PADDING,
};

export function buttonLabelStyle(fontSize: number): TextStyle {
  return {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize,
    lineHeight: fontSize >= 16 ? 22 : 20,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  };
}
