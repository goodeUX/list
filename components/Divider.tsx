import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type DividerProps = { inset?: number; style?: ViewStyle };

export default function Divider({ inset = 0, style }: DividerProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="none"
      style={[{ height: 1, backgroundColor: colors.border, marginHorizontal: inset }, style]}
    />
  );
}
