import { MaterialIcons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type TextInput,
  type ViewStyle,
} from 'react-native';

import ThemedTextInput, { getThemedInputContainerStyle } from '@/components/ThemedTextInput';
import { useTheme } from '@/contexts/ThemeContext';
import { space } from '@/lib/design';

export const ADD_SUBMIT_BUTTON_SIZE = 40;

type Props = {
  focused: boolean;
  nativeID?: string;
  onBlur: () => void;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onPressRow: () => void;
  onSubmit: () => void;
  /** Runs before the tick's press blurs the input, so blur can tell it apart. */
  onSubmitPressIn: () => void;
  placeholder: string;
  style?: StyleProp<ViewStyle>;
  submitAccessibilityLabel: string;
  value: string;
};

/**
 * A text field with a tick button inside it that appears once there is text
 * to add — the "Add an item" field on the list page, and "Add a sub-item" on
 * the item page.
 */
const AddInputRow = forwardRef<TextInput, Props>(function AddInputRow(
  {
    focused,
    nativeID,
    onBlur,
    onChangeText,
    onFocus,
    onPressRow,
    onSubmit,
    onSubmitPressIn,
    placeholder,
    style,
    submitAccessibilityLabel,
    value,
  },
  ref,
) {
  const { colors, radii, typography } = useTheme();
  const canSubmit = Boolean(value.trim());
  const showSubmitButton = focused && value.length > 0;

  const handleSubmitMouseDown = (event: { preventDefault: () => void }) => {
    // Keep focus in the input on web, where a click would otherwise blur it.
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onSubmitPressIn();
    onSubmit();
  };

  return (
    <Pressable
      nativeID={nativeID}
      onPress={onPressRow}
      style={[
        styles.row,
        getThemedInputContainerStyle(colors, focused),
        {
          borderRadius: radii.item,
          paddingRight: showSubmitButton ? space[1] : focused ? space[3] : space[4],
        },
        style,
      ]}
    >
      <ThemedTextInput
        ref={ref}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        returnKeyType="done"
        showSoftInputOnFocus
        style={[typography.body, styles.input]}
        value={value}
        variant="plain"
      />
      <Pressable
        accessibilityLabel={submitAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        disabled={Platform.OS !== 'web' && !canSubmit}
        {...(Platform.OS === 'web'
          ? ({ onMouseDown: handleSubmitMouseDown } as object)
          : { onPress: onSubmit, onPressIn: onSubmitPressIn })}
        style={({ pressed }) => [
          styles.submitButton,
          {
            backgroundColor: colors.primary,
            borderRadius: radii.checkbox,
            opacity: showSubmitButton ? (pressed && canSubmit ? 0.85 : 1) : 0,
            pointerEvents: showSubmitButton ? 'auto' : 'none',
            width: showSubmitButton ? ADD_SUBMIT_BUTTON_SIZE : 0,
          },
        ]}
      >
        <MaterialIcons color={colors.onPrimary} name="check" size={22} />
      </Pressable>
    </Pressable>
  );
});

export default AddInputRow;

const styles = StyleSheet.create({
  input: {
    flex: 1,
    minHeight: ADD_SUBMIT_BUTTON_SIZE - 4,
    paddingVertical: space[2],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[2],
    paddingLeft: space[4],
    paddingVertical: space[1],
  },
  submitButton: {
    alignItems: 'center',
    height: ADD_SUBMIT_BUTTON_SIZE,
    justifyContent: 'center',
    width: ADD_SUBMIT_BUTTON_SIZE,
  },
});
