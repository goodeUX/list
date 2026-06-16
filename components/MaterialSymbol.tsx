import { Platform, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { MATERIAL_SYMBOL_FONT, getMaterialSymbolGlyph } from '@/lib/materialSymbol';

function getVariationSettings(filled: boolean): string {
  return `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`;
}

type MaterialSymbolProps = {
  name: string;
  size?: number;
  color?: string;
  filled?: boolean;
  style?: StyleProp<TextStyle>;
};

export default function MaterialSymbol({
  name,
  size = 24,
  color,
  filled = false,
  style,
}: MaterialSymbolProps) {
  return (
    <Text
      style={[
        styles.icon,
        {
          color,
          fontSize: size,
          lineHeight: size,
          fontVariationSettings: getVariationSettings(filled),
        } as TextStyle,
        style,
      ]}
    >
      {getMaterialSymbolGlyph(name)}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontFamily: MATERIAL_SYMBOL_FONT,
    fontStyle: 'normal',
    fontWeight: '400',
    userSelect: 'none',
    ...(Platform.OS === 'web'
      ? ({ fontFeatureSettings: '"liga" 1' } as TextStyle)
      : null),
  },
});
