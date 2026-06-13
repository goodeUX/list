import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import type { ListItem } from '@/lib/types';

type ListItemRowProps = {
  item: ListItem;
  onToggle: () => void;
  onPress: () => void;
};

export default function ListItemRow({ item, onToggle, onPress }: ListItemRowProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.item,
          opacity: item.checked ? 0.65 : pressed ? 0.92 : 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={item.checked ? 'Mark incomplete' : 'Mark complete'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        hitSlop={8}
        onPress={onToggle}
        style={[
          styles.checkbox,
          {
            backgroundColor: item.checked ? colors.success : 'transparent',
            borderColor: item.checked ? colors.success : colors.border,
            borderRadius: radii.checkbox,
          },
        ]}
      >
        {item.checked ? (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={14}
            tintColor={colors.surface}
          />
        ) : null}
      </Pressable>

      <View style={styles.content}>
        <Text
          numberOfLines={2}
          style={[
            styles.name,
            {
              color: colors.text,
              textDecorationLine: item.checked ? 'line-through' : 'none',
            },
          ]}
        >
          {item.name}
        </Text>

        {item.quantity || item.link ? (
          <View style={[styles.meta, { gap: spacing.xs }]}>
            {item.quantity ? (
              <View
                style={[
                  styles.pill,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderRadius: radii.checkbox,
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: colors.textSecondary }]}>
                  {item.quantity}
                </Text>
              </View>
            ) : null}

            {item.link ? (
              <View
                style={[
                  styles.pill,
                  styles.linkPill,
                  {
                    backgroundColor: colors.accentSoft,
                    borderRadius: radii.checkbox,
                  },
                ]}
              >
                <SymbolView
                  name={{ ios: 'link', android: 'link', web: 'link' }}
                  size={12}
                  tintColor={colors.accent}
                />
                <Text style={[styles.pillText, { color: colors.accent }]}>Link</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
  },
  checkbox: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  linkPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  pillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
});
