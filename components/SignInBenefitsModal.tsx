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
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import Button from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { CONTENT_MAX_WIDTH } from '@/lib/slideTransition';

const MODAL_DURATION_MS = 240;
const MODAL_TRANSLATE_Y = 48;
const MODAL_EASING = Easing.out(Easing.cubic);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Benefit = {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
};

const BENEFITS: Benefit[] = [
  { icon: 'playlist-add', text: 'Create more than 2 lists' },
  { icon: 'sync', text: 'Sync your lists across devices' },
  { icon: 'group-add', text: 'Invite others to collaborate' },
];

type SignInBenefitsModalProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  onSignIn: () => void;
  onDismiss: () => void;
};

export default function SignInBenefitsModal({
  visible,
  title,
  subtitle,
  onSignIn,
  onDismiss,
}: SignInBenefitsModalProps) {
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
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.text} style={styles.benefitRow}>
              <MaterialIcons color={colors.accent} name={benefit.icon} size={22} />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {benefit.text}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonGroup}>
          <Button label="Log in or sign up" onPress={onSignIn} variant="primary" />
          <Button label="Maybe later" onPress={onDismiss} variant="ghost" />
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
    zIndex: 100,
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
    fontSize: 24,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  benefits: {
    gap: 14,
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  benefitText: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  buttonGroup: {
    gap: 8,
  },
});
