import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { playToggleHaptic } from '@/lib/haptics';
import {
  ITEM_CHECKBOX_ICON_SIZE,
  ITEM_CHECKBOX_SIZE,
  ITEM_CHECKBOX_TEXT_GAP,
} from '@/lib/itemRowMetrics';
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
            <SymbolView
              name="checkmark"
              size={ITEM_CHECKBOX_ICON_SIZE}
              tintColor={colors.onPrimary}
            />
          ) : (
            <MaterialIcons
              color={colors.onPrimary}
              name="check"
              size={ITEM_CHECKBOX_ICON_SIZE}
            />
          )
        ) : null}
      </View>

      <Text
        numberOfLines={1}
        style={[
          typography.body,
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
    gap: ITEM_CHECKBOX_TEXT_GAP,
  },
  checkbox: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: ITEM_CHECKBOX_SIZE,
    justifyContent: 'center',
    width: ITEM_CHECKBOX_SIZE,
  },
  name: {
    flex: 1,
  },
});
