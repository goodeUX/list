import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const BUTTON_HORIZONTAL_PADDING = 16;

export const buttonLayoutStyle: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'visible',
  paddingHorizontal: BUTTON_HORIZONTAL_PADDING,
  paddingVertical: 4,
};

// Semibold custom fonts can draw past their advance width; pad labels so glyphs
// are not clipped by overflow:hidden ancestors (e.g. rounded modal shells).
const BUTTON_LABEL_GLYPH_PADDING_START = Platform.OS === 'android' ? 8 : 4;
const BUTTON_LABEL_GLYPH_PADDING_END = Platform.OS === 'android' ? 20 : 4;

export function buttonLabelStyle(fontSize: number): TextStyle {
  return {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize,
    lineHeight: Math.round(fontSize * 1.5),
    textAlign: 'center',
    flexShrink: 0,
    paddingStart: BUTTON_LABEL_GLYPH_PADDING_START,
    paddingEnd: BUTTON_LABEL_GLYPH_PADDING_END,
    ...(Platform.OS === 'android'
      ? {
          includeFontPadding: false,
          textAlignVertical: 'center',
        }
      : null),
  };
}
