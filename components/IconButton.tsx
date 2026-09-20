import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type IconButtonVariant = 'surface' | 'ghost' | 'primary';

type IconButtonProps = {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  variant?: IconButtonVariant;
  accessibilityLabel: string;
  disabled?: boolean;
  size?: number;
};

export default function IconButton({
  icon,
  onPress,
  variant = 'surface',
  accessibilityLabel,
  disabled = false,
  size = 40,
}: IconButtonProps) {
  const { colors, radius, elevation } = useTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const bg = isPrimary ? colors.primary : isGhost ? 'transparent' : colors.surface;
  const fg = isPrimary ? colors.onPrimary : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: bg,
          borderRadius: radius.full,
          height: size,
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          width: size,
        },
        !isGhost ? elevation.e1 : null,
      ]}
    >
      <MaterialIcons color={fg} name={icon} size={Math.round(size * 0.55)} />
    </Pressable>
  );
}
