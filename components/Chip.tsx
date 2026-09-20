import { Pressable, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type ChipProps = { label: string; selected?: boolean; onPress?: () => void };

export default function Chip({ label, selected = false, onPress }: ChipProps) {
  const { colors, radius, typography } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        backgroundColor: selected ? colors.primarySoft : colors.surfaceMuted,
        borderColor: selected ? colors.primary : 'transparent',
        borderRadius: radius.full,
        borderWidth: 1,
        opacity: pressed ? 0.85 : 1,
        paddingHorizontal: 14,
        paddingVertical: 8,
      })}
    >
      <Text style={{ ...typography.label, color: selected ? colors.primary : colors.text }}>{label}</Text>
    </Pressable>
  );
}
