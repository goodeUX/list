import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useListItemCounts } from '@/hooks/useListItems';
import type { AppList } from '@/lib/types';

type ListCardProps = {
  list: AppList;
};

export default function ListCard({ list }: ListCardProps) {
  const { colors, radii, spacing } = useTheme();

  const { doneCount, totalCount } = useListItemCounts(list.id);
  const progress = totalCount > 0 ? doneCount / totalCount : 0;
  const collaboratorCount = list.memberIds.length;
  const isShared = collaboratorCount > 1;

  const handlePress = () => {
    router.push({
      pathname: '/list/[id]',
      params: { id: list.id },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.card,
          opacity: pressed ? 0.92 : 1,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{list.emoji}</Text>
        <View style={styles.titleBlock}>
          <Text
            numberOfLines={1}
            style={[styles.name, { color: colors.text }]}
          >
            {list.name}
          </Text>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {doneCount}/{totalCount} complete
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.checkbox,
            marginTop: spacing.sm,
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.success,
              borderRadius: radii.checkbox,
              width: `${Math.round(progress * 100)}%`,
            },
          ]}
        />
      </View>

      {isShared ? (
        <Text
          style={[
            styles.collaborators,
            { color: colors.textSecondary, marginTop: spacing.sm },
          ]}
        >
          {collaboratorCount} collaborators
        </Text>
      ) : null}
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
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
  progressText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  collaborators: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
});
