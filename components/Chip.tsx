import { Pressable, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { space } from '@/lib/design';

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
        paddingHorizontal: space[4],
        paddingVertical: space[2],
      })}
    >
      <Text style={{ ...typography.label, color: selected ? colors.primary : colors.text }}>{label}</Text>
    </Pressable>
  );
}
