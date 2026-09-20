import type { TextStyle } from 'react-native';
import { fontFamily, fontSize, lineHeight } from './primitives';

export const typography = {
  display: { fontFamily: fontFamily.displayBold, fontSize: fontSize.display, lineHeight: lineHeight.display },
  h1: { fontFamily: fontFamily.displayBold, fontSize: fontSize.h1, lineHeight: lineHeight.h1 },
  h2: { fontFamily: fontFamily.displaySemiBold, fontSize: fontSize.h2, lineHeight: lineHeight.h2 },
  title: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.title, lineHeight: lineHeight.title },
  bodyL: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.bodyL, lineHeight: lineHeight.bodyL },
  body: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.body, lineHeight: lineHeight.body },
  bodyS: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.bodyS, lineHeight: lineHeight.bodyS },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.label, lineHeight: lineHeight.label },
  caption: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.caption, lineHeight: lineHeight.caption },
} as const satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
