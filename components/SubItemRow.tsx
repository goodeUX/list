import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ItemNameText } from '@/components/CompletedText';
import SubItemConnector from '@/components/SubItemConnector';
import { useTheme } from '@/contexts/ThemeContext';
import { playToggleHaptic } from '@/lib/haptics';
import { space } from '@/lib/design';
import {
  ITEM_CHECKBOX_HIT_SIZE,
  ITEM_CHECKBOX_ICON_SIZE,
  ITEM_CHECKBOX_SIZE,
  ITEM_CHECKBOX_TEXT_GAP,
} from '@/lib/itemRowMetrics';

const ROW_PADDING_VERTICAL = space[1];
// The whole row toggles the sub-item; slop grows its tap target to the same
// height as every other checkbox's.
const ROW_HIT_SLOP = (ITEM_CHECKBOX_HIT_SIZE - (ITEM_CHECKBOX_SIZE + ROW_PADDING_VERTICAL * 2)) / 2;
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
  const { colors, radii, typography } = useTheme();

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
      hitSlop={{ bottom: ROW_HIT_SLOP, top: ROW_HIT_SLOP }}
      onPress={handleToggle}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
    >
      <SubItemConnector />
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: subItem.checked ? colors.success : colors.surface,
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

      {/* Styled like a completed item's name when checked. */}
      <View style={styles.name}>
        <ItemNameText checked={subItem.checked} numberOfLines={1} style={typography.body}>
          {subItem.name}
        </ItemNameText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: ROW_PADDING_VERTICAL,
  },
  // Figma: connector, 4px, checkbox; then the same checkbox-to-name space
  // as a parent item.
  checkbox: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: ITEM_CHECKBOX_SIZE,
    justifyContent: 'center',
    marginLeft: space[1],
    marginRight: ITEM_CHECKBOX_TEXT_GAP,
    width: ITEM_CHECKBOX_SIZE,
  },
  name: {
    flex: 1,
  },
});
