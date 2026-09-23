import { useEffect } from 'react';
import { Platform, StyleSheet, View, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';

// How a completed item (or sub-item) reads: its text fades and is struck
// through with a line thick enough to stay legible.
export const COMPLETED_OPACITY = 0.6;
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

/** An animated opacity style that fades text out as it's completed. */
export function useCompletedTextStyle(checked: boolean) {
  const textOpacity = useSharedValue(checked ? COMPLETED_OPACITY : 1);

  useEffect(() => {
    textOpacity.value = withTiming(checked ? COMPLETED_OPACITY : 1, {
      duration: 200,
    });
  }, [checked, textOpacity]);

  return useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));
}

type CompletedTextProps = {
  animatedStyle: object;
  checked: boolean;
  children: string;
  color: string;
  numberOfLines?: number;
  style: TextStyle;
};

/**
 * Text struck through when `checked`. Native text decoration draws a hairline
 * strike, so outside the web the line is drawn as its own view.
 */
export function CompletedText({
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

type ItemNameTextProps = {
  checked: boolean;
  children: string;
  numberOfLines?: number;
  style: TextStyle;
};

/** An item or sub-item name, styled as completed when `checked`. */
export function ItemNameText({ checked, children, numberOfLines, style }: ItemNameTextProps) {
  const { colors } = useTheme();
  const animatedStyle = useCompletedTextStyle(checked);

  return (
    <CompletedText
      animatedStyle={animatedStyle}
      checked={checked}
      color={checked ? colors.textMuted : colors.text}
      numberOfLines={numberOfLines}
      style={style}
    >
      {children}
    </CompletedText>
  );
}

const styles = StyleSheet.create({
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
});
