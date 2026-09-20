import { useEffect } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { absoluteFill } from '@/lib/absoluteFill';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import Button from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppAlertButton, AppAlertRequest } from '@/lib/appAlert';
import { CONTENT_MAX_WIDTH } from '@/lib/slideTransition';

const MODAL_DURATION_MS = 220;
const MODAL_TRANSLATE_Y = 40;
const MODAL_EASING = Easing.out(Easing.cubic);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function variantForButton(
  button: AppAlertButton,
): 'primary' | 'ghost' | 'destructive' {
  if (button.style === 'destructive') {
    return 'destructive';
  }
  if (button.style === 'cancel') {
    return 'ghost';
  }
  return 'primary';
}

type AppAlertModalProps = {
  visible: boolean;
  request: AppAlertRequest | null;
  onPressButton: (button: AppAlertButton) => void;
  onDismiss: () => void;
};

export default function AppAlertModal({
  visible,
  request,
  onPressButton,
  onDismiss,
}: AppAlertModalProps) {
  const { colors, radius, space, typography, elevation } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const backdropOpacity = useSharedValue(0);
  const dialogOpacity = useSharedValue(0);
  const dialogTranslateY = useSharedValue(MODAL_TRANSLATE_Y);

  useEffect(() => {
    const timing = { duration: MODAL_DURATION_MS, easing: MODAL_EASING };
    if (visible) {
      backdropOpacity.value = withTiming(1, timing);
      dialogOpacity.value = withTiming(1, timing);
      dialogTranslateY.value = withTiming(0, timing);
    } else {
      backdropOpacity.value = 0;
      dialogOpacity.value = 0;
      dialogTranslateY.value = MODAL_TRANSLATE_Y;
    }
  }, [backdropOpacity, dialogOpacity, dialogTranslateY, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });

    return () => subscription.remove();
  }, [onDismiss, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const dialogStyle = useAnimatedStyle(() => ({
    opacity: dialogOpacity.value,
    transform: [{ translateY: dialogTranslateY.value }],
  }));

  return (
    <View
      accessibilityElementsHidden={!visible}
      accessibilityViewIsModal={visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
      style={[
        styles.shell,
        { pointerEvents: visible ? 'auto' : 'none' },
        Platform.OS === 'web' && visible
          ? ({ height: windowHeight, position: 'fixed' } as object)
          : null,
      ]}
    >
      <AnimatedPressable
        accessibilityLabel="Dismiss"
        onPress={onDismiss}
        style={[styles.backdrop, { backgroundColor: colors.scrim }, backdropStyle]}
      />
      <Animated.View
        style={[
          styles.dialog,
          dialogStyle,
          elevation.e3,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.xl,
            gap: space[6],
            padding: space[6],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[typography.h2, { color: colors.text }]}>
            {request?.title}
          </Text>
          {request?.message ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {request.message}
            </Text>
          ) : null}
        </View>

        <View style={styles.buttonGroup}>
          {request?.buttons.map((button, index) => (
            <Button
              key={`${button.text}-${index}`}
              label={button.text}
              onPress={() => onPressButton(button)}
              variant={variantForButton(button)}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: 200,
  },
  backdrop: {
    ...absoluteFill,
  },
  dialog: {
    borderWidth: 1,
    maxWidth: CONTENT_MAX_WIDTH - 24,
    width: '100%',
    zIndex: 1,
  },
  header: {
    gap: 8,
  },
  buttonGroup: {
    gap: 8,
  },
});
