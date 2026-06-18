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
  label?: string;
  labelBackgroundColor?: string;
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
    const hasValue =
      props.value != null
        ? String(props.value).length > 0
        : props.defaultValue != null
          ? String(props.defaultValue).length > 0
          : false;
    const isLabelFloating = focused || hasValue;
    const labelColor = isLabelFloating ? colors.text : colors.textSecondary;

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

    const input = (
      <TextInput
        ref={setInputRef}
        autoFocus={autoFocus}
        cursorColor={colors.accent}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={label ? undefined : placeholder}
        placeholderTextColor={placeholderTextColor ?? colors.textSecondary}
        selectionColor={colors.accentSoft}
        showSoftInputOnFocus
        style={themedStyle}
        underlineColorAndroid="transparent"
        {...props}
      />
    );

    if (!label || variant !== 'bordered') {
      return input;
    }

    return (
      <View style={styles.floatingLabelContainer}>
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
  floatingLabelContainer: {
    overflow: 'visible',
  },
  floatingLabel: {
    left: 12,
    paddingHorizontal: 4,
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
    fontFamily: 'NunitoSans_400Regular',
  },
  floatingLabelTextRaised: {
    fontSize: 12,
    lineHeight: 16,
  },
  floatingLabelTextResting: {
    fontSize: 16,
    lineHeight: BORDERED_INPUT_LINE_HEIGHT,
  },
});

export default ThemedTextInput;
