import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
  type EmitterSubscription,
} from 'react-native';

import EmojiPickerSheet from '@/components/EmojiPickerSheet';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getBorderedInputHeight,
  getThemedInputBackgroundColor,
  getThemedInputBorderColor,
  BORDERED_INPUT_BORDER_WIDTH,
} from '@/components/ThemedTextInput';

const BUTTON_SIZE = getBorderedInputHeight();

// Fallback for IMEs that never emit keyboardDidHide, so the sheet still opens.
const KEYBOARD_HIDE_TIMEOUT_MS = 350;

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
  const { colors, radii } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pendingOpenRef = useRef<{
    subscription: EmitterSubscription;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const cancelPendingOpen = useCallback(() => {
    if (!pendingOpenRef.current) {
      return;
    }

    pendingOpenRef.current.subscription.remove();
    clearTimeout(pendingOpenRef.current.timer);
    pendingOpenRef.current = null;
  }, []);

  useEffect(() => cancelPendingOpen, [cancelPendingOpen]);

  const openPicker = () => {
    if (disabled) {
      return;
    }

    cancelPendingOpen();

    // Android resizes the window to sit above the soft keyboard, which would
    // anchor the sheet mid-screen and make it jump once the keyboard closes.
    // Waiting for the keyboard to finish hiding keeps the slide-in at the bottom.
    if (!Keyboard.isVisible()) {
      setPickerOpen(true);
      return;
    }

    const open = () => {
      cancelPendingOpen();
      setPickerOpen(true);
    };

    pendingOpenRef.current = {
      subscription: Keyboard.addListener('keyboardDidHide', open),
      timer: setTimeout(open, KEYBOARD_HIDE_TIMEOUT_MS),
    };

    Keyboard.dismiss();
  };

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setPickerOpen(false);
  };

  return (
    <View style={styles.anchor}>
      <Pressable
        accessibilityLabel="Choose list icon"
        accessibilityRole="button"
        accessibilityState={{ expanded: pickerOpen }}
        disabled={disabled}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: getThemedInputBackgroundColor(colors, pickerOpen),
            borderColor: getThemedInputBorderColor(colors, pickerOpen),
            borderRadius: radii.item,
            height: BUTTON_SIZE,
            opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
            width: BUTTON_SIZE,
          },
        ]}
      >
        <Text style={styles.emoji}>{value}</Text>
      </Pressable>

      <EmojiPickerSheet
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        selected={value}
        visible={pickerOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    alignSelf: 'flex-start',
  },
  button: {
    alignItems: 'center',
    borderWidth: BORDERED_INPUT_BORDER_WIDTH,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
    lineHeight: 28,
  },
});
