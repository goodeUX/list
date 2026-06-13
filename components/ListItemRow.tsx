import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';
import type { ListItem } from '@/lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ListItemRowProps = {
  item: ListItem;
  onToggle: () => void;
  onPress: () => void;
};

export default function ListItemRow({ item, onToggle, onPress }: ListItemRowProps) {
  const { colors, radii, spacing } = useTheme();
  const checkScale = useSharedValue(1);
  const nameOpacity = useSharedValue(item.checked ? 0.65 : 1);

  const checkboxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
  }));

  useEffect(() => {
    nameOpacity.value = withTiming(item.checked ? 0.65 : 1, { duration: 200 });
  }, [item.checked, nameOpacity]);

  const handleToggle = () => {
    checkScale.value = withSpring(0.9, { damping: 12 }, () => {
      checkScale.value = withSpring(1);
    });
    onToggle();
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          opacity: pressed ? 0.72 : 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <AnimatedPressable
        accessibilityLabel={item.checked ? 'Mark incomplete' : 'Mark complete'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        onPress={handleToggle}
        style={[styles.checkboxHitArea, checkboxStyle]}
      >
        <View
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
        </View>
      </AnimatedPressable>

      <View style={styles.content}>
        <Animated.Text
          numberOfLines={2}
          style={[
            styles.name,
            nameStyle,
            {
              color: colors.text,
              textDecorationLine: item.checked ? 'line-through' : 'none',
            },
          ]}
        >
          {item.name}
        </Animated.Text>

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
    flexDirection: 'row',
    gap: 12,
  },
  checkboxHitArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
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
    fontSize: 18,
    lineHeight: 24,
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
