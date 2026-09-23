import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import {
  getBorderedInputHeight,
  BORDERED_INPUT_BORDER_WIDTH,
} from '@/components/ThemedTextInput';

// Square cell sized to the height of a field's content. It draws no border or
// background of its own — the surrounding field supplies both so the emoji and
// the name read as one control.
const CELL_SIZE = getBorderedInputHeight() - BORDERED_INPUT_BORDER_WIDTH * 2;

const DEFAULT_EMOJI_SIZE = 24;

type EmojiPickerButtonProps = {
  value: string;
  onPress: () => void;
  expanded?: boolean;
  disabled?: boolean;
  /** Font size of the emoji; the cell stays the same size. */
  emojiSize?: number;
};

/**
 * Opens the emoji sheet. The sheet itself is rendered by the parent rather than
 * here, so it can sit above the whole modal instead of inside this row.
 */
export default function EmojiPickerButton({
  value,
  onPress,
  expanded = false,
  disabled = false,
  emojiSize = DEFAULT_EMOJI_SIZE,
}: EmojiPickerButtonProps) {
  const { colors, radius, elevation } = useTheme();

  return (
    <Pressable
      accessibilityLabel="Choose list icon"
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        expanded ? elevation.e1 : null,
        {
          // Shows the sheet is open, since the field itself has no chrome.
          backgroundColor: expanded ? colors.surfaceMuted : 'transparent',
          borderRadius: radius.md,
          opacity: disabled ? 0.6 : pressed ? 0.5 : 1,
        },
      ]}
    >
      <Text style={{ fontSize: emojiSize, lineHeight: emojiSize + 6 }}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    height: CELL_SIZE,
    justifyContent: 'center',
    width: CELL_SIZE,
  },
});
