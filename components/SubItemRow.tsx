import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { playToggleHaptic } from '@/lib/haptics';
import { space } from '@/lib/design';
import type { SubItem } from '@/lib/types';

type SubItemRowProps = {
  subItem: SubItem;
  disabled?: boolean;
  onToggle: () => void;
};

export default function SubItemRow({
  subItem,
  disabled = false,
  onToggle,
}: SubItemRowProps) {
  const { colors, radii, spacing, typography } = useTheme();

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    if (!subItem.checked) {
      playToggleHaptic();
    }
    onToggle();
  };

  return (
    <Pressable
      accessibilityLabel={subItem.checked ? 'Mark incomplete' : 'Mark complete'}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: subItem.checked, disabled }}
      disabled={disabled}
      onPress={handleToggle}
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: spacing.xs, opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: subItem.checked ? colors.success : 'transparent',
            borderColor: subItem.checked ? colors.success : colors.border,
            borderRadius: radii.checkbox,
          },
        ]}
      >
        {subItem.checked ? (
          Platform.OS === 'ios' ? (
            <SymbolView name="checkmark" size={11} tintColor={colors.onPrimary} />
          ) : (
            <MaterialIcons color={colors.onPrimary} name="check" size={11} />
          )
        ) : null}
      </View>

      <Text
        numberOfLines={1}
        style={[
          typography.bodyS,
          styles.name,
          {
            color: subItem.checked ? colors.textSecondary : colors.text,
            textDecorationLine: subItem.checked ? 'line-through' : 'none',
          },
        ]}
      >
        {subItem.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[3],
  },
  checkbox: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  name: {
    flex: 1,
  },
});
