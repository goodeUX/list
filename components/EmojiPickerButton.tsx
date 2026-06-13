import { useRef, useState } from 'react';
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

const LIST_EMOJIS = [
  '📋', '🛒', '✅', '🎁', '✈️', '🏠', '📚', '🍎', '💼', '🎉',
  '🧳', '📝', '⭐', '❤️', '🐶', '🐱', '🌿', '🌸', '☀️', '🌙',
  '🔥', '💡', '🎯', '🏃', '🧘', '💪', '🍕', '☕', '🎵', '📷',
  '🚗', '🛠️', '💊', '🧹', '👕', '🎨', '📅', '💰', '🌮', '🥗',
  '🍰', '🎂', '🍼', '👶', '🎓', '🏋️', '🎮', '📱', '💻', '🌍',
];

const BUTTON_SIZE = 48;
const DROPDOWN_WIDTH = 288;
const DROPDOWN_MAX_HEIGHT = 220;

type EmojiPickerButtonProps = {
  value: string;
  onChange: (emoji: string) => void;
  disabled?: boolean;
};

export default function EmojiPickerButton({
  value,
  onChange,
  disabled = false,
}: EmojiPickerButtonProps) {
  const { colors, radii, spacing } = useTheme();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [anchorLayout, setAnchorLayout] = useState<LayoutRectangle | null>(null);
  const anchorRef = useRef<View>(null);

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

  const dropdownTop = anchorLayout ? anchorLayout.y + anchorLayout.height + spacing.xs : 0;
  const dropdownLeft = anchorLayout?.x ?? 0;

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
                maxHeight: DROPDOWN_MAX_HEIGHT,
                top: dropdownTop,
                width: DROPDOWN_WIDTH,
              },
            ]}
          >
            <Text style={[styles.dropdownTitle, { color: colors.textSecondary }]}>
              Choose an icon
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.emojiGrid, { gap: spacing.xs }]}>
                {LIST_EMOJIS.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityLabel={`Use ${item} as list icon`}
                    accessibilityRole="button"
                    onPress={() => handleSelectEmoji(item)}
                    style={({ pressed }) => [
                      styles.emojiOption,
                      {
                        backgroundColor:
                          item === value ? colors.accentSoft : colors.surfaceMuted,
                        borderColor: item === value ? colors.accent : colors.border,
                        borderRadius: radii.checkbox,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.emojiOptionText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
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
    gap: 8,
    padding: 10,
    position: 'absolute',
    shadowColor: '#2C2417',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  dropdownTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emojiOption: {
    alignItems: 'center',
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 30,
  },
  emojiOptionText: {
    fontSize: 20,
    lineHeight: 24,
  },
});
