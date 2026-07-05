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
  const { colors, radii, spacing } = useTheme();
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
        style={[styles.backdrop, backdropStyle]}
      />
      <Animated.View
        style={[
          styles.dialog,
          dialogStyle,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            gap: spacing.lg,
            padding: spacing.lg,
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 12px 40px rgba(44, 36, 23, 0.2)' }
              : null),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {request?.title}
          </Text>
          {request?.message ? (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
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
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: 200,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 23, 0.35)',
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
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    lineHeight: 30,
  },
  message: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  buttonGroup: {
    gap: 8,
  },
});
