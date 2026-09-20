import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { scheduleTextInputFocus } from '@/lib/focusTextInput';
import { fontFamily, fontSize, lineHeight, space, typography } from '@/lib/design';
import type { ThemeColors } from '@/lib/theme';

export const BORDERED_INPUT_BORDER_WIDTH = 1;
const BORDERED_INPUT_PADDING_VERTICAL = space[3];
const BORDERED_INPUT_LINE_HEIGHT = typography.body.lineHeight;

export function getBorderedInputHeight(
  lineHeight = BORDERED_INPUT_LINE_HEIGHT,
): number {
  return (
    BORDERED_INPUT_BORDER_WIDTH * 2 +
    BORDERED_INPUT_PADDING_VERTICAL * 2 +
    lineHeight
  );
}

export type ThemedTextInputProps = TextInputProps & {
  invalid?: boolean;
  label?: string;
  labelBackgroundColor?: string;
  variant?: 'bordered' | 'plain';
};

export function getThemedInputBackgroundColor(
  colors: ThemeColors,
  _focused: boolean,
): string {
  // Inputs stay on the white surface in every state; focus is signalled by the
  // border color, not a background change.
  return colors.surface;
}

export function getThemedInputBorderColor(
  colors: ThemeColors,
  focused: boolean,
  invalid = false,
): string {
  if (invalid) {
    return colors.danger;
  }
  return focused ? colors.secondary : colors.border;
}

export function getThemedInputContainerStyle(
  colors: ThemeColors,
  focused: boolean,
  invalid = false,
): Pick<ViewStyle, 'backgroundColor' | 'borderColor' | 'borderWidth'> {
  return {
    backgroundColor: getThemedInputBackgroundColor(colors, focused),
    borderColor: getThemedInputBorderColor(colors, focused, invalid),
    borderWidth: BORDERED_INPUT_BORDER_WIDTH,
  };
}

function assignInputRef(
  node: TextInput | null,
  ref: React.ForwardedRef<TextInput>,
  innerRef: React.MutableRefObject<TextInput | null>,
) {
  innerRef.current = node;

  if (typeof ref === 'function') {
    ref(node);
    return;
  }

  if (ref) {
    ref.current = node;
  }
}

const ThemedTextInput = forwardRef<TextInput, ThemedTextInputProps>(
  function ThemedTextInput(
    {
      autoFocus = false,
      invalid = false,
      label,
      labelBackgroundColor,
      variant = 'bordered',
      style,
      onFocus,
      onBlur,
      placeholder,
      placeholderTextColor,
      ...props
    },
    ref,
  ) {
    const { colors, radius } = useTheme();
    const [focused, setFocused] = useState(false);
    const innerRef = useRef<TextInput | null>(null);
    const isDisabled = props.editable === false;

    const setInputRef = useCallback(
      (node: TextInput | null) => {
        assignInputRef(node, ref, innerRef);
      },
      [ref],
    );

    useLayoutEffect(() => {
      if (!autoFocus) {
        return;
      }

      scheduleTextInputFocus(innerRef.current);
    }, [autoFocus]);

    const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
      (event) => {
        setFocused(true);
        onFocus?.(event);
      },
      [onFocus],
    );

    const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
      (event) => {
        setFocused(false);
        onBlur?.(event);
      },
      [onBlur],
    );

    const borderColor = getThemedInputBorderColor(colors, focused, invalid);
    const backgroundColor = getThemedInputBackgroundColor(colors, focused);
    const hasValue =
      props.value != null
        ? String(props.value).length > 0
        : props.defaultValue != null
          ? String(props.defaultValue).length > 0
          : false;
    const isLabelFloating = focused || hasValue;
    const labelColor = isLabelFloating ? colors.text : colors.textSecondary;
    const hasFloatingLabel = Boolean(label) && variant === 'bordered';

    const themedStyle: StyleProp<TextStyle> = [
      styles.base,
      variant === 'bordered' && styles.bordered,
      variant === 'bordered' && {
        backgroundColor,
        borderColor,
        borderRadius: radius.md,
        color: colors.text,
      },
      variant === 'plain' && {
        color: colors.text,
      },
      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null,
      style,
      isDisabled && !hasFloatingLabel ? styles.disabled : null,
    ];

    const input = (
      <TextInput
        ref={setInputRef}
        accessibilityState={{ disabled: isDisabled }}
        autoFocus={autoFocus}
        cursorColor={colors.primary}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={label ? undefined : placeholder}
        placeholderTextColor={placeholderTextColor ?? colors.textMuted}
        selectionColor={colors.primarySoft}
        showSoftInputOnFocus
        style={themedStyle}
        underlineColorAndroid="transparent"
        {...props}
      />
    );

    if (!hasFloatingLabel) {
      return input;
    }

    return (
      <View
        style={[styles.floatingLabelContainer, isDisabled ? styles.disabled : null]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.floatingLabel,
            isLabelFloating ? styles.floatingLabelRaised : styles.floatingLabelResting,
            {
              backgroundColor: isLabelFloating
                ? (labelBackgroundColor ?? colors.bg)
                : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.floatingLabelText,
              isLabelFloating ? styles.floatingLabelTextRaised : styles.floatingLabelTextResting,
              { color: labelColor },
            ]}
          >
            {label}
          </Text>
        </View>
        {input}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  base: {
    ...typography.body,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  bordered: {
    borderWidth: BORDERED_INPUT_BORDER_WIDTH,
    paddingHorizontal: space[4],
    paddingVertical: BORDERED_INPUT_PADDING_VERTICAL,
  },
  disabled: {
    opacity: 0.6,
  },
  floatingLabelContainer: {
    overflow: 'visible',
  },
  floatingLabel: {
    left: 12,
    paddingHorizontal: space[1],
    position: 'absolute',
    zIndex: 1,
  },
  floatingLabelRaised: {
    top: -8,
  },
  floatingLabelResting: {
    top: BORDERED_INPUT_PADDING_VERTICAL + BORDERED_INPUT_BORDER_WIDTH,
  },
  floatingLabelText: {
    fontFamily: fontFamily.bodyRegular,
  },
  floatingLabelTextRaised: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
  },
  floatingLabelTextResting: {
    fontSize: fontSize.body,
    lineHeight: BORDERED_INPUT_LINE_HEIGHT,
  },
});

export default ThemedTextInput;
