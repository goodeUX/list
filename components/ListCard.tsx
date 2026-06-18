import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useListItemCounts } from '@/hooks/useListItems';
import type { AppList } from '@/lib/types';

type ListCardProps = {
  list: AppList;
  countsRefreshKey?: number;
};

export default function ListCard({ list, countsRefreshKey = 0 }: ListCardProps) {
  const { colors, radii, spacing } = useTheme();

  const { doneCount, totalCount } = useListItemCounts(list.id, countsRefreshKey);
  const incompleteCount = totalCount - doneCount;
  const isShared = list.memberIds.length > 1;

  const handlePress = () => {
    router.push({
      pathname: '/list/[id]',
      params: { id: list.id, name: list.name, emoji: list.emoji },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.card,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{list.emoji}</Text>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: colors.text, flex: 1 }]}
        >
          {list.name}
        </Text>
        <View style={styles.trailingMeta}>
          {isShared ? (
            <View accessibilityLabel="Shared list" style={styles.groupIcon}>
              <MaterialIcons color={colors.textSecondary} name="group" size={16} />
            </View>
          ) : null}
          <View
            style={[
              styles.itemCountBadge,
              {
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.checkbox,
              },
            ]}
          >
            <Text style={[styles.itemCount, { color: colors.textSecondary }]}>
              {incompleteCount}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  name: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
  trailingMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  groupIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCountBadge: {
    alignItems: 'center',
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  itemCount: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
});
