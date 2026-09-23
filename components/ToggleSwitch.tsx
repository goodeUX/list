import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

const TOGGLE_WIDTH = 40;
const TOGGLE_HEIGHT = 24;
const TOGGLE_THUMB_SIZE = 20;
const TOGGLE_THUMB_TRAVEL = TOGGLE_WIDTH - TOGGLE_THUMB_SIZE - 4;

/**
 * The app's on/off toggle, drawn only — for a row that is itself the
 * switch (e.g. a menu item), which handles the press and accessibility.
 */
export function ToggleTrack({ value }: { value: boolean }) {
  const { colors } = useTheme();

  return (
    <View
      pointerEvents="none"
      style={[styles.track, { backgroundColor: value ? colors.secondarySoft : colors.border }]}
    >
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: value ? colors.secondary : colors.surface,
            transform: [{ translateX: value ? TOGGLE_THUMB_TRAVEL : 0 }],
          },
        ]}
      />
    </View>
  );
}

type ToggleSwitchProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

/** The app's on/off toggle as a control of its own. */
export default function ToggleSwitch({
  accessibilityLabel,
  disabled = false,
  onValueChange,
  value,
}: ToggleSwitchProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={12}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => ({ opacity: disabled ? 0.6 : pressed ? 0.7 : 1 })}
    >
      <ToggleTrack value={value} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: TOGGLE_HEIGHT / 2,
    height: TOGGLE_HEIGHT,
    justifyContent: 'center',
    padding: 2,
    width: TOGGLE_WIDTH,
  },
  thumb: {
    borderRadius: TOGGLE_THUMB_SIZE / 2,
    height: TOGGLE_THUMB_SIZE,
    width: TOGGLE_THUMB_SIZE,
  },
});
