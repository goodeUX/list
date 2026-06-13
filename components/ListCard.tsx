import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';
import { useListItemCounts } from '@/hooks/useListItems';
import type { AppList } from '@/lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ListCardProps = {
  list: AppList;
};

export default function ListCard({ list }: ListCardProps) {
  const { colors, radii, spacing } = useTheme();
  const scale = useSharedValue(1);

  const { doneCount, totalCount } = useListItemCounts(list.id);
  const incompleteCount = totalCount - doneCount;
  const collaboratorCount = list.memberIds.length;
  const isShared = collaboratorCount > 1;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    router.push({
      pathname: '/list/[id]',
      params: { id: list.id, name: list.name, emoji: list.emoji },
    });
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        animatedStyle,
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
        <View style={styles.titleBlock}>
          <Text
            numberOfLines={1}
            style={[styles.name, { color: colors.text }]}
          >
            {list.name}
          </Text>
        </View>
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
    </AnimatedPressable>
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
  collaborators: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
});
