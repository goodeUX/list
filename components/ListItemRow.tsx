import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import SubItemRow from '@/components/SubItemRow';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubItemsExpanded } from '@/hooks/useSubItemsExpanded';
import { fontFamily, fontSize, lineHeight, palette, space } from '@/lib/design';
import { playToggleHaptic } from '@/lib/haptics';
import { formatItemNameForDisplay } from '@/lib/itemName';
import {
  ITEM_CHECKBOX_HIT_SIZE,
  ITEM_CHECKBOX_ICON_SIZE,
  ITEM_CHECKBOX_SIZE,
  ITEM_ROW_GAP,
} from '@/lib/itemRowMetrics';
import { subItemProgress, sortSubItems } from '@/lib/subItems';
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
  onLongPress?: () => void;
  isActive?: boolean;
  dragHandle?: ReactNode;
  onToggleSubItem?: (subId: string) => void;
};

export default function ListItemRow({
  disabled = false,
  item,
  onToggle,
  onPress,
  onLongPress,
  isActive = false,
  dragHandle,
  onToggleSubItem,
}: ListItemRowProps) {
  const { colors, radii, radius, spacing, typography } = useTheme();
  const { done, total } = subItemProgress(item.subItems);
  const hasSubItems = total > 0;
  const [subItemsExpanded, toggleSubItemsExpanded] = useSubItemsExpanded(item.id);
  // The chevron points right when collapsed and turns to point down.
  const chevronRotation = useSharedValue(subItemsExpanded ? 90 : 0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  useEffect(() => {
    chevronRotation.value = withTiming(subItemsExpanded ? 90 : 0, { duration: 200 });
  }, [chevronRotation, subItemsExpanded]);

  // Sub-items fade in when expanded with the chevron, but not when the page
  // opens with them already expanded.
  const [fadeInSubItems, setFadeInSubItems] = useState(false);
  const handleToggleSubItemsExpanded = () => {
    setFadeInSubItems(true);
    toggleSubItemsExpanded();
  };
  const checkScale = useSharedValue(1);
  const textOpacity = useSharedValue(item.checked ? COMPLETED_OPACITY : 1);
  const [hovered, setHovered] = useState(false);

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
    <View>
    <Pressable
      accessibilityState={{ disabled }}
      delayLongPress={250}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          opacity: pressed && !isActive ? 0.72 : 1,
          paddingVertical: spacing.sm,
        },
        isActive
          ? {
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              paddingHorizontal: spacing.sm,
            }
          : null,
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
      </AnimatedPressable>

      <View style={styles.content}>
        <CompletedText
          animatedStyle={completedTextStyle}
          checked={item.checked}
          color={item.checked ? colors.textMuted : colors.text}
          numberOfLines={1}
          style={typography.body}
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
                    backgroundColor: palette.butter[200],
                    borderRadius: radii.checkbox,
                  },
                ]}
              >
                <CompletedText
                  animatedStyle={completedTextStyle}
                  checked={item.checked}
                  color={palette.sand[900]}
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
                    backgroundColor: palette.butter[200],
                    borderRadius: radii.checkbox,
                  },
                ]}
              >
                {Platform.OS === 'ios' ? (
                  <SymbolView name="link" size={12} tintColor={palette.sand[900]} />
                ) : (
                  <MaterialIcons color={palette.sand[900]} name="link" size={12} />
                )}
                <CompletedText
                  animatedStyle={completedTextStyle}
                  checked={item.checked}
                  color={palette.sand[900]}
                  style={styles.pillText}
                >
                  Link
                </CompletedText>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {hasSubItems ? (
        <View
          style={[
            styles.progressBadge,
            { backgroundColor: palette.teal[100], borderRadius: radii.checkbox },
          ]}
        >
          <Text style={[styles.progressText, { color: palette.sand[900] }]}>
            {done}/{total}
          </Text>
        </View>
      ) : null}

      {hasSubItems ? (
        <Pressable
          accessibilityLabel={subItemsExpanded ? 'Hide sub-items' : 'Show sub-items'}
          accessibilityRole="button"
          accessibilityState={{ expanded: subItemsExpanded }}
          hitSlop={12}
          onPress={handleToggleSubItemsExpanded}
          style={({ pressed }) => [styles.expandButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Animated.View style={chevronStyle}>
            {Platform.OS === 'ios' ? (
              <SymbolView name="chevron.right" size={14} tintColor={colors.textSecondary} />
            ) : (
              <MaterialIcons color={colors.textSecondary} name="chevron-right" size={22} />
            )}
          </Animated.View>
        </Pressable>
      ) : null}

      {dragHandle ? (
        <View
          style={[
            styles.dragHandle,
            {
              opacity: hovered || isActive ? 1 : 0,
              pointerEvents: hovered || isActive ? 'auto' : 'none',
            },
            Platform.OS === 'web'
              ? ({ transitionDuration: '120ms', transitionProperty: 'opacity' } as object)
              : null,
          ]}
        >
          {dragHandle}
        </View>
      ) : null}
    </Pressable>
      {hasSubItems && subItemsExpanded ? (
        <Animated.View
          entering={fadeInSubItems ? FadeIn.duration(200) : undefined}
          style={[styles.subItems, { paddingLeft: spacing.lg + space[1] }]}
        >
          {sortSubItems(item.subItems).map((subItem) => (
            <SubItemRow
              key={subItem.id}
              disabled={disabled}
              onToggle={() => onToggleSubItem?.(subItem.id)}
              subItem={subItem}
            />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: ITEM_ROW_GAP,
  },
  checkboxHitArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ITEM_CHECKBOX_HIT_SIZE,
    minWidth: ITEM_CHECKBOX_HIT_SIZE,
  },
  checkbox: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: ITEM_CHECKBOX_SIZE,
    justifyContent: 'center',
    width: ITEM_CHECKBOX_SIZE,
  },
  content: {
    flex: 1,
    gap: space[1],
  },
  dragHandle: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
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
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
  },
  linkPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[1],
  },
  pillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
  },
  progressBadge: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    minWidth: 28,
    paddingHorizontal: space[2],
  },
  progressText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    textAlign: 'center',
  },
  expandButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  subItems: {
    gap: space[2],
    marginTop: -space[2],
    paddingBottom: space[4],
  },
});
