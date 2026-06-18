import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';
import { playToggleHaptic } from '@/lib/haptics';
import { formatItemNameForDisplay } from '@/lib/itemName';
import type { ListItem } from '@/lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const COMPLETED_OPACITY = 0.6;
const STRIKETHROUGH_HEIGHT = 2;

function getCompletedDecoration(checked: boolean) {
  if (!checked) {
    return null;
  }

  if (Platform.OS === 'web') {
    return {
      textDecorationLine: 'line-through' as const,
      textDecorationThickness: STRIKETHROUGH_HEIGHT,
    };
  }

  return null;
}

type CompletedTextProps = {
  animatedStyle: object;
  checked: boolean;
  children: string;
  color: string;
  numberOfLines?: number;
  style: TextStyle;
};

function CompletedText({
  animatedStyle,
  checked,
  children,
  color,
  numberOfLines,
  style,
}: CompletedTextProps) {
  const completedDecoration = getCompletedDecoration(checked);

  return (
    <View style={styles.completedTextWrap}>
      <Animated.Text
        numberOfLines={numberOfLines}
        style={[style, { color }, completedDecoration, animatedStyle]}
      >
        {children}
      </Animated.Text>
      {checked && Platform.OS !== 'web' ? (
        <Animated.View
          style={[
            styles.strikethroughLine,
            { backgroundColor: color, pointerEvents: 'none' },
            animatedStyle,
          ]}
        />
      ) : null}
    </View>
  );
}

type ListItemRowProps = {
  disabled?: boolean;
  item: ListItem;
  onToggle: () => void;
  onPress: () => void;
};

export default function ListItemRow({
  disabled = false,
  item,
  onToggle,
  onPress,
}: ListItemRowProps) {
  const { colors, radii, spacing } = useTheme();
  const checkScale = useSharedValue(1);
  const textOpacity = useSharedValue(item.checked ? COMPLETED_OPACITY : 1);

  const checkboxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const completedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  useEffect(() => {
    textOpacity.value = withTiming(item.checked ? COMPLETED_OPACITY : 1, {
      duration: 200,
    });
  }, [item.checked, textOpacity]);

  const handleToggle = () => {
    if (disabled) {
      return;
    }

    if (!item.checked) {
      playToggleHaptic();
    }
    checkScale.value = withSpring(0.9, { damping: 12 }, () => {
      checkScale.value = withSpring(1);
    });
    onToggle();
  };

  return (
    <Pressable
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          opacity: pressed ? 0.72 : 1,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <AnimatedPressable
        accessibilityLabel={item.checked ? 'Mark incomplete' : 'Mark complete'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked, disabled }}
        disabled={disabled}
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
            Platform.OS === 'ios' ? (
              <SymbolView name="checkmark" size={14} tintColor={colors.surface} />
            ) : (
              <MaterialIcons color={colors.surface} name="check" size={14} />
            )
          ) : null}
        </View>
      </AnimatedPressable>

      <View style={styles.content}>
        <CompletedText
          animatedStyle={completedTextStyle}
          checked={item.checked}
          color={colors.text}
          numberOfLines={2}
          style={styles.name}
        >
          {formatItemNameForDisplay(item.name)}
        </CompletedText>

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
                <CompletedText
                  animatedStyle={completedTextStyle}
                  checked={item.checked}
                  color={colors.textSecondary}
                  style={styles.pillText}
                >
                  {item.quantity}
                </CompletedText>
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
                {Platform.OS === 'ios' ? (
                  <SymbolView name="link" size={12} tintColor={colors.accent} />
                ) : (
                  <MaterialIcons color={colors.accent} name="link" size={12} />
                )}
                <CompletedText
                  animatedStyle={completedTextStyle}
                  checked={item.checked}
                  color={colors.accent}
                  style={styles.pillText}
                >
                  Link
                </CompletedText>
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
  completedTextWrap: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  strikethroughLine: {
    height: STRIKETHROUGH_HEIGHT,
    left: 0,
    marginTop: -STRIKETHROUGH_HEIGHT / 2,
    position: 'absolute',
    right: 0,
    top: '50%',
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
