import { forwardRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextInput,
  type TextStyle,
} from 'react-native';

import ThemedTextInput, {
  inputLabelStyle,
  type MaterialIconName,
  type ThemedTextInputProps,
} from '@/components/ThemedTextInput';
import { useTheme } from '@/contexts/ThemeContext';
import { space } from '@/lib/design';

type Props = Omit<ThemedTextInputProps, 'icon' | 'label' | 'style' | 'variant'> & {
  /** Content under the input, such as an error or a link. */
  children?: ReactNode;
  /** Placeholder in the empty variant, where there's no label to explain the field. */
  emptyPlaceholder: string;
  icon: MaterialIconName;
  label: string;
  /** Input style once the field is showing as a bordered text field. */
  style?: StyleProp<TextStyle>;
  value: string;
};

/**
 * A field on the edit item page. While it's empty and not being edited it
 * shows ThemedTextInput's `empty` variant (just an icon and placeholder);
 * once it's focused or has a value it's the default bordered field with its
 * label above.
 */
const ItemDetailField = forwardRef<TextInput, Props>(function ItemDetailField(
  { children, emptyPlaceholder, icon, label, onBlur, onFocus, placeholder, style, value, ...props },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const isEmpty = !focused && value.length === 0;

  return (
    <View style={styles.field}>
      {isEmpty ? null : (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}
      <ThemedTextInput
        ref={ref}
        {...props}
        icon={icon}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholder={isEmpty ? emptyPlaceholder : placeholder}
        style={isEmpty ? undefined : style}
        value={value}
        variant={isEmpty ? 'empty' : 'bordered'}
      />
      {children}
    </View>
  );
});

export default ItemDetailField;

export const itemDetailFieldStyles = StyleSheet.create({
  field: {
    gap: space[2],
  },
  label: inputLabelStyle,
});

const styles = itemDetailFieldStyles;
