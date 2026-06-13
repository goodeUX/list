import { usePreventRemove, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import type { NavigationAction } from '@react-navigation/native';

import {
  SLIDE_IN_MS,
  SLIDE_OUT_MS,
  getSlideDistance,
  isSlideTransitionEnabled,
} from '@/lib/slideTransition';

type SlideTransitionOptions = {
  ready?: boolean;
};

type SlideTransition = {
  animatedStyle: AnimatedStyle<{ transform: { translateX: number }[] }>;
  goBack: () => void;
  isEnabled: boolean;
};

export function useChildSlideTransition(
  options: SlideTransitionOptions = {},
): SlideTransition {
  const { ready = true } = options;
  const router = useRouter();
  const navigation = useNavigation();
  const isEnabled = isSlideTransitionEnabled();
  const slideDistance = getSlideDistance();
  const translateX = useSharedValue(isEnabled ? slideDistance : 0);
  const [shouldPreventRemove, setShouldPreventRemove] = useState(isEnabled);
  const pendingAction = useRef<NavigationAction | null>(null);
  const isAnimatingOut = useRef(false);

  const completeExit = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    isAnimatingOut.current = false;

    if (!action) {
      return;
    }

    setShouldPreventRemove(false);
    requestAnimationFrame(() => {
      navigation.dispatch(action);
      setShouldPreventRemove(true);
    });
  }, [navigation]);

  useLayoutEffect(() => {
    if (!isEnabled || !ready) {
      return;
    }

    translateX.value = withTiming(0, {
      duration: SLIDE_IN_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [isEnabled, ready, translateX]);

  usePreventRemove(
    isEnabled && shouldPreventRemove,
    ({ data }) => {
      if (isAnimatingOut.current) {
        return;
      }

      isAnimatingOut.current = true;
      pendingAction.current = data.action;

      translateX.value = withTiming(
        slideDistance,
        {
          duration: SLIDE_OUT_MS,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (!finished) {
            isAnimatingOut.current = false;
            pendingAction.current = null;
            return;
          }

          runOnJS(completeExit)();
        },
      );
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    animatedStyle,
    goBack,
    isEnabled,
  };
}
