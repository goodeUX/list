import { usePreventRemove, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import type { NavigationAction } from '@react-navigation/native';

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

type SlideExitState = {
  isAnimating: boolean;
  action: NavigationAction | null;
};

const IDLE_SLIDE_EXIT: SlideExitState = {
  isAnimating: false,
  action: null,
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
  const [slideExit, setSlideExit] = useState<SlideExitState>(IDLE_SLIDE_EXIT);
  const isStartingExitRef = useRef(false);

  useEffect(() => {
    if (!slideExit.isAnimating) {
      isStartingExitRef.current = false;
    }
  }, [slideExit.isAnimating]);

  const handleExitAnimationEnd = useCallback(
    (finished: boolean) => {
      setSlideExit((current) => {
        if (!current.isAnimating) {
          return current;
        }

        if (!finished) {
          return IDLE_SLIDE_EXIT;
        }

        const action = current.action;
        if (action) {
          setShouldPreventRemove(false);
          requestAnimationFrame(() => {
            navigation.dispatch(action);
            setShouldPreventRemove(true);
          });
        }

        return IDLE_SLIDE_EXIT;
      });
    },
    [navigation],
  );

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

  usePreventRemove(
    isEnabled && shouldPreventRemove,
    ({ data }) => {
      if (isStartingExitRef.current) {
        return;
      }

      isStartingExitRef.current = true;
      setSlideExit({ isAnimating: true, action: data.action });

      translateX.value = withTiming(
        slideDistance,
        {
          duration: SLIDE_OUT_MS,
          easing: SLIDE_OUT_EASING,
        },
        (finished) => {
          'worklet';
          runOnJS(handleExitAnimationEnd)(finished ?? false);
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
};
