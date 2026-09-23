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

import ThemedTextInput, {
  EMPTY_INPUT_ICON_SIZE,
  getThemedInputContainerStyle,
  type MaterialIconName,
} from '@/components/ThemedTextInput';
import { useTheme } from '@/contexts/ThemeContext';
import { space } from '@/lib/design';

export const ADD_SUBMIT_BUTTON_SIZE = 40;

type Props = {
  focused: boolean;
  /** Shown before the text in the `empty` variant. */
  icon?: MaterialIconName;
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
  /**
   * `default` is the bordered field. `empty` matches ThemedTextInput's empty
   * variant: an icon and placeholder with no border or background.
   */
  variant?: 'default' | 'empty';
};

/**
 * A text field with a tick button inside it that appears once there is text
 * to add — the "Add an item" field on the list page, and "Add a sub-item" on
 * the item page.
 */
const AddInputRow = forwardRef<TextInput, Props>(function AddInputRow(
  {
    focused,
    icon,
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
    variant = 'default',
  },
  ref,
) {
  const isEmptyVariant = variant === 'empty';
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
        isEmptyVariant
          ? styles.emptyRow
          : [
              getThemedInputContainerStyle(colors, focused),
              {
                borderRadius: radii.item,
                paddingRight: showSubmitButton ? space[1] : focused ? space[3] : space[4],
              },
            ],
        style,
      ]}
    >
      {isEmptyVariant && icon ? (
        <MaterialIcons color={colors.primary} name={icon} size={EMPTY_INPUT_ICON_SIZE} />
      ) : null}
      <ThemedTextInput
        ref={ref}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={isEmptyVariant ? colors.textSecondary : undefined}
        returnKeyType="done"
        showSoftInputOnFocus
        style={[typography.body, styles.input, isEmptyVariant ? styles.emptyInput : null]}
        value={value}
        variant="plain"
      />
      {/* An empty field has nothing to add, so it has no tick. */}
      {isEmptyVariant ? null : (
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
      )}
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
  // Lines the text up with ThemedTextInput's empty variant: no border,
  // background or left padding, and the same overall height.
  emptyRow: {
    paddingLeft: 0,
    paddingVertical: 0,
  },
  emptyInput: {
    paddingHorizontal: 0,
    paddingVertical: space[3],
  },
  submitButton: {
    alignItems: 'center',
    height: ADD_SUBMIT_BUTTON_SIZE,
    justifyContent: 'center',
    width: ADD_SUBMIT_BUTTON_SIZE,
  },
});
