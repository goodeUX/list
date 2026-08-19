import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import {
  getBorderedInputHeight,
  BORDERED_INPUT_BORDER_WIDTH,
} from '@/components/ThemedTextInput';

// Square cell filling the height of the field it sits inside. It draws no border
// or background of its own — the surrounding field supplies both so the emoji and
// the name read as one control.
const CELL_SIZE = getBorderedInputHeight() - BORDERED_INPUT_BORDER_WIDTH * 2;

type EmojiPickerButtonProps = {
  value: string;
  onPress: () => void;
  expanded?: boolean;
  disabled?: boolean;
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
}: EmojiPickerButtonProps) {
  const { colors, radii } = useTheme();

  return (
    <Pressable
      accessibilityLabel="Choose list icon"
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        {
          // Shows the sheet is open, since the field itself has no chrome.
          backgroundColor: expanded ? colors.surfaceMuted : 'transparent',
          borderRadius: radii.item,
          opacity: disabled ? 0.6 : pressed ? 0.5 : 1,
        },
      ]}
    >
      <Text style={styles.emoji}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    width: CELL_SIZE,
  },
  emoji: {
    fontSize: 24,
    lineHeight: 30,
  },
});
