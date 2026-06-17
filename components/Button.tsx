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

type ButtonVariant = 'primary' | 'secondary' | 'surface' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  onPressIn?: () => void;
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
  onPressIn,
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
  const isGhost = variant === 'ghost';
  const isLarge = isPrimary || isSurface;
  const isDisabled = disabled || loading;
  const labelColor = isPrimary
    ? colors.surface
    : isGhost
      ? colors.textSecondary
      : colors.text;
  const iconColor = isPrimary
    ? colors.surface
    : isSurface
      ? colors.accent
      : isGhost
        ? colors.textSecondary
        : colors.text;
  const iconSize = isLarge ? SURFACE_BUTTON_ICON_SIZE : BUTTON_ICON_SIZE;
  const labelStyle = [buttonLabelStyle(16), { color: labelColor }];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.button,
        isLarge ? styles.largeButton : null,
        isGhost ? styles.ghostButton : null,
        buttonLayoutStyle,
        {
          backgroundColor: isPrimary
            ? colors.accent
            : isSurface
              ? colors.surface
              : undefined,
          borderColor: isPrimary || isSurface || isGhost ? 'transparent' : colors.border,
          borderRadius: radii.item,
          borderWidth: isPrimary || isSurface || isGhost ? 0 : 1,
          opacity: pressed || isDisabled ? (isGhost ? 0.7 : isLarge ? 0.7 : 0.85) : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : icon ? (
        <View style={styles.iconRow}>
          <MaterialIcons color={iconColor} name={icon} size={iconSize} />
          <Text style={labelStyle}>{label}</Text>
        </View>
      ) : (
        <Text style={[labelStyle, styles.labelOnly]}>{label}</Text>
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
  ghostButton: {
    minHeight: 44,
  },
  labelOnly: {
    width: '100%',
  },
  iconRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
});
