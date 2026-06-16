import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';

const BUTTON_ICON_SIZE = 20;
const SURFACE_BUTTON_ICON_SIZE = 24;

type ButtonVariant = 'primary' | 'secondary' | 'surface';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: ComponentProps<typeof MaterialIcons>['name'];
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export default function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { colors, radii } = useTheme();
  const isPrimary = variant === 'primary';
  const isSurface = variant === 'surface';
  const isLarge = isPrimary || isSurface;
  const isDisabled = disabled || loading;
  const labelColor = isPrimary ? colors.surface : colors.text;
  const iconColor = isPrimary ? colors.surface : isSurface ? colors.accent : colors.text;
  const iconSize = isLarge ? SURFACE_BUTTON_ICON_SIZE : BUTTON_ICON_SIZE;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isLarge ? styles.largeButton : null,
        buttonLayoutStyle,
        {
          backgroundColor: isPrimary
            ? colors.accent
            : isSurface
              ? colors.surface
              : undefined,
          borderColor: isPrimary || isSurface ? 'transparent' : colors.border,
          borderRadius: radii.item,
          borderWidth: isPrimary || isSurface ? 0 : 1,
          opacity: pressed || isDisabled ? (isLarge ? 0.7 : 0.85) : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <MaterialIcons color={iconColor} name={icon} size={iconSize} />
          ) : null}
          <Text style={[buttonLabelStyle(16), { color: labelColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    width: '100%',
  },
  largeButton: {
    minHeight: 54,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
});
