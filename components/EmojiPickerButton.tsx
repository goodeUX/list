import { useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { getBorderedInputHeight } from '@/components/ThemedTextInput';

// One emoji per list category (6 columns × 5 rows).
const LIST_EMOJIS = [
  '📋', '🛒', '📚', '🎵', '🐛', '🐦',
  '🐟', '🐱', '🐶', '✈️', '👶', '🏠',
  '🏋️', '🎉', '🚗', '⛺', '👪', '📅',
  '💊', '🎯', '💰', '🗺️', '🎨', '🧹',
  '💼', '📷', '🔗', '📍', '🧵', '⭐',
];

const EMOJI_COLUMNS = 6;
const VISIBLE_ROWS = 5;
const BUTTON_SIZE = getBorderedInputHeight();

function getEmojiCellSize(
  dropdownWidth: number,
  horizontalPadding: number,
  columnGap: number,
): number {
  const horizontalGaps = (EMOJI_COLUMNS - 1) * columnGap;
  const availableWidth = dropdownWidth - horizontalPadding * 2 - horizontalGaps;
  return Math.floor(availableWidth / EMOJI_COLUMNS);
}

function chunkEmojis(emojis: string[], columns: number): string[][] {
  const rows: string[][] = [];

  for (let index = 0; index < emojis.length; index += columns) {
    rows.push(emojis.slice(index, index + columns));
  }

  return rows;
}

type EmojiPickerButtonProps = {
  value: string;
  onChange: (emoji: string) => void;
  disabled?: boolean;
  dropdownContainerLayout?: LayoutRectangle | null;
};

export default function EmojiPickerButton({
  value,
  onChange,
  disabled = false,
  dropdownContainerLayout = null,
}: EmojiPickerButtonProps) {
  const { colors, radii, spacing } = useTheme();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [anchorLayout, setAnchorLayout] = useState<LayoutRectangle | null>(null);
  const anchorRef = useRef<View>(null);
  const emojiRows = useMemo(() => chunkEmojis(LIST_EMOJIS, EMOJI_COLUMNS), []);

  const closeDropdown = () => {
    setDropdownVisible(false);
  };

  const openDropdown = () => {
    if (disabled) {
      return;
    }

    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorLayout({ x, y, width, height });
      setDropdownVisible(true);
    });
  };

  const handleSelectEmoji = (emoji: string) => {
    onChange(emoji);
    closeDropdown();
  };

  const dropdownTop = anchorLayout
    ? anchorLayout.y + anchorLayout.height + spacing.xs
    : 0;
  const containerLeft = dropdownContainerLayout?.x ?? anchorLayout?.x ?? 0;
  const dropdownWidth = dropdownContainerLayout?.width ?? 288;
  const dropdownLeft = containerLeft;
  const emojiCellSize = getEmojiCellSize(dropdownWidth, spacing.sm, spacing.xs);
  const gridMaxHeight =
    VISIBLE_ROWS * emojiCellSize + (VISIBLE_ROWS - 1) * spacing.xs;

  return (
    <>
      <View ref={anchorRef} collapsable={false} style={styles.anchor}>
        <Pressable
          accessibilityLabel="Choose list icon"
          accessibilityRole="button"
          accessibilityState={{ expanded: dropdownVisible }}
          disabled={disabled}
          onPress={openDropdown}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: dropdownVisible ? colors.accent : colors.border,
              borderRadius: radii.item,
              height: BUTTON_SIZE,
              opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
              width: BUTTON_SIZE,
            },
          ]}
        >
          <Text style={styles.emoji}>{value}</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeDropdown}
        transparent
        visible={dropdownVisible}
      >
        <Pressable onPress={closeDropdown} style={styles.backdrop}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.dropdown,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.item,
                left: dropdownLeft,
                padding: spacing.sm,
                top: dropdownTop,
                width: dropdownWidth,
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={{ gap: spacing.xs }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: gridMaxHeight }}
            >
              {emojiRows.map((row, rowIndex) => (
                <View
                  key={`emoji-row-${rowIndex}`}
                  style={[styles.emojiRow, { gap: spacing.xs }]}
                >
                  {row.map((item) => (
                    <Pressable
                      key={item}
                      accessibilityLabel={`Use ${item} as list icon`}
                      accessibilityRole="button"
                      onPress={() => handleSelectEmoji(item)}
                      style={({ pressed }) => [
                        styles.emojiOption,
                        {
                          backgroundColor:
                            item === value ? colors.surfaceMuted : 'transparent',
                          borderRadius: radii.checkbox,
                          height: emojiCellSize,
                          opacity: pressed ? 0.85 : 1,
                          width: emojiCellSize,
                        },
                      ]}
                    >
                      <Text style={styles.emojiOptionText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    alignSelf: 'flex-start',
  },
  button: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
    lineHeight: 28,
  },
  backdrop: {
    flex: 1,
  },
  dropdown: {
    borderWidth: 1,
    elevation: 8,
    position: 'absolute',
    shadowColor: '#2C2417',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  emojiRow: {
    flexDirection: 'row',
    width: '100%',
  },
  emojiOption: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOptionText: {
    fontSize: 24,
    lineHeight: 28,
  },
});
