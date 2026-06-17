import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { scheduleTextInputFocus } from '@/lib/focusTextInput';
import type { ThemeColors } from '@/lib/theme';

export const BORDERED_INPUT_BORDER_WIDTH = 1;
const BORDERED_INPUT_PADDING_VERTICAL = 14;
const BORDERED_INPUT_LINE_HEIGHT = 22;

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
  variant?: 'bordered' | 'plain';
};

export function getThemedInputBackgroundColor(
  colors: ThemeColors,
  focused: boolean,
): string {
  return focused ? colors.surfaceMuted : colors.surface;
}

export function getThemedInputBorderColor(
  colors: ThemeColors,
  focused: boolean,
  invalid = false,
): string {
  return focused || invalid ? colors.accent : colors.border;
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
      variant = 'bordered',
      style,
      onFocus,
      onBlur,
      placeholderTextColor,
      ...props
    },
    ref,
  ) {
    const { colors, radii } = useTheme();
    const [focused, setFocused] = useState(false);
    const innerRef = useRef<TextInput | null>(null);

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

    const themedStyle: StyleProp<TextStyle> = [
      styles.base,
      variant === 'bordered' && styles.bordered,
      variant === 'bordered' && {
        backgroundColor,
        borderColor,
        borderRadius: radii.item,
        color: colors.text,
      },
      variant === 'plain' && {
        color: colors.text,
      },
      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null,
      style,
    ];

    return (
      <TextInput
        ref={setInputRef}
        autoFocus={autoFocus}
        cursorColor={colors.accent}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholderTextColor={placeholderTextColor ?? colors.textSecondary}
        selectionColor={colors.accentSoft}
        showSoftInputOnFocus
        style={themedStyle}
        underlineColorAndroid="transparent"
        {...props}
      />
    );
  },
);

const styles = StyleSheet.create({
  base: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 22,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  bordered: {
    borderWidth: BORDERED_INPUT_BORDER_WIDTH,
    paddingHorizontal: 16,
    paddingVertical: BORDERED_INPUT_PADDING_VERTICAL,
  },
});

export default ThemedTextInput;
