import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';

import {
  SLIDE_IN_EASING,
  SLIDE_IN_MS,
  SLIDE_OUT_EASING,
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

/**
 * Slides a child screen in on mount and back out before it leaves.
 *
 * expo-router 57 no longer exposes React Navigation's `usePreventRemove`, so the
 * exit is driven from `goBack()` (the in-app back controls) and the Android
 * hardware back button rather than by intercepting every navigation removal.
 * The iOS edge-swipe gesture falls back to the native pop.
 */
export function useChildSlideTransition(
  options: SlideTransitionOptions = {},
): SlideTransition {
  const { ready = true } = options;
  const router = useRouter();
  const isEnabled = isSlideTransitionEnabled();
  const slideDistance = getSlideDistance();
  const translateX = useSharedValue(isEnabled ? slideDistance : 0);
  const isExitingRef = useRef(false);

  useLayoutEffect(() => {
    if (!isEnabled) {
      return;
    }

    if (!ready) {
      translateX.value = slideDistance;
      return;
    }

    translateX.value = withTiming(0, {
      duration: SLIDE_IN_MS,
      easing: SLIDE_IN_EASING,
    });
  }, [isEnabled, ready, slideDistance, translateX]);

  const finishExit = useCallback(
    (finished: boolean) => {
      if (finished) {
        router.back();
      } else {
        // Animation was interrupted; allow another attempt.
        isExitingRef.current = false;
      }
    },
    [router],
  );

  const goBack = useCallback(() => {
    if (!isEnabled) {
      router.back();
      return;
    }

    if (isExitingRef.current) {
      return;
    }
    isExitingRef.current = true;

    translateX.value = withTiming(
      slideDistance,
      {
        duration: SLIDE_OUT_MS,
        easing: SLIDE_OUT_EASING,
      },
      (finished) => {
        'worklet';
        runOnJS(finishExit)(finished ?? false);
      },
    );
  }, [finishExit, isEnabled, router, slideDistance, translateX]);

  // While this screen is focused, animate out on Android hardware back.
  useFocusEffect(
    useCallback(() => {
      if (!isEnabled) {
        return;
      }

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          goBack();
          return true;
        },
      );

      return () => subscription.remove();
    }, [goBack, isEnabled]),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return {
    animatedStyle,
    goBack,
    isEnabled,
  };
}
