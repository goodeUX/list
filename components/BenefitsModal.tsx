import { MaterialIcons } from '@expo/vector-icons';
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
import { space } from '@/lib/design';
import { CONTENT_MAX_WIDTH } from '@/lib/slideTransition';

const MODAL_DURATION_MS = 240;
const MODAL_TRANSLATE_Y = 48;
const MODAL_EASING = Easing.out(Easing.cubic);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type BenefitItem = {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
};

type BenefitsModalProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  benefits: BenefitItem[];
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onDismiss: () => void;
};

export default function BenefitsModal({
  visible,
  title,
  subtitle,
  benefits,
  primaryLabel,
  secondaryLabel = 'Maybe later',
  onPrimary,
  onDismiss,
}: BenefitsModalProps) {
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
          <Text style={[typography.h2, { color: colors.text }]}>{title}</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <View key={benefit.text} style={styles.benefitRow}>
              <MaterialIcons color={colors.primary} name={benefit.icon} size={22} />
              <Text style={[typography.label, { color: colors.text }, styles.benefitText]}>
                {benefit.text}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonGroup}>
          <Button label={primaryLabel} onPress={onPrimary} variant="primary" />
          <Button label={secondaryLabel} onPress={onDismiss} variant="ghost" />
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
    paddingHorizontal: space[3],
    zIndex: 100,
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
    gap: space[2],
  },
  benefits: {
    gap: space[4],
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[3],
  },
  benefitText: {
    flex: 1,
  },
  buttonGroup: {
    gap: space[2],
  },
});
