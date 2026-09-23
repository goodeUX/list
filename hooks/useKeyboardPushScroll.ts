import { useCallback, useRef, type Component } from 'react';
import { TextInput, type View } from 'react-native';
import {
  KeyboardState,
  runOnJS,
  scrollTo,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { space } from '@/lib/design';

// Space kept between the focused field and the top of the keyboard.
const FIELD_KEYBOARD_GAP = space[8];

type Measurable = Pick<View, 'measureInWindow'>;

type Options = {
  /**
   * Content that should stay visible with a given focused field — e.g. the
   * first row below it. The push keeps whichever of the field and this
   * target ends lower above the keyboard.
   */
  getRevealTarget?: (field: Measurable) => Measurable | null | undefined;
};

/**
 * Makes the opening keyboard push the focused field up, frame by frame,
 * instead of the list jumping once the keyboard has finished animating.
 *
 * Each frame of the keyboard animation, the viewport (the Animated.View with
 * `viewportRef`, `viewportStyle` and `onViewportTouchEnd`) shrinks by the keyboard's current height,
 * and the list (`scrollRef`) scrolls just enough to keep the focused field
 * above the keyboard's top edge. A field the keyboard never reaches doesn't
 * move. Both run on the UI thread so they stay in step with the keyboard.
 *
 * `bottomInset` is the screen padding already below the viewport (the safe
 * area), which the keyboard covers before it reaches the viewport.
 */
export function useKeyboardPushScroll<T extends Component>(
  bottomInset: number,
  { getRevealTarget }: Options = {},
) {
  const getRevealTargetRef = useRef(getRevealTarget);
  getRevealTargetRef.current = getRevealTarget;
  // Without the translucent flags, useAnimatedKeyboard takes over the Android
  // window insets and makes the system bars opaque (white bars) and shifts the
  // header. Reanimated's keyboard (window insets) also stays reliable under
  // edge-to-edge, where the RN Keyboard events report height 0.
  const keyboard = useAnimatedKeyboard({
    isNavigationBarTranslucentAndroid: true,
    isStatusBarTranslucentAndroid: true,
  });
  const scrollRef = useAnimatedRef<T>();
  const viewportRef = useRef<View>(null);
  const scrollOffset = useSharedValue(0);
  const startOffset = useSharedValue(0);
  // Window y of the bottom edge to keep above the keyboard (the focused field,
  // or its reveal target if lower), or -1 when there's nothing to keep.
  const fieldBottom = useSharedValue(-1);
  const viewportBottom = useSharedValue(0);

  const measureFocusedField = useCallback(() => {
    const field = TextInput.State.currentlyFocusedInput();
    const viewport = viewportRef.current;
    if (!field || !viewport) {
      fieldBottom.value = -1;
      return;
    }
    const offset = scrollOffset.value;
    const bottomOf = (view: Measurable) =>
      new Promise<number>((resolve) => {
        view.measureInWindow((_x, y, _width, height) => resolve(y + height));
      });
    const revealTarget = getRevealTargetRef.current?.(field);
    // The viewport's own box doesn't change as its padding grows, so this
    // measures its full height even if the keyboard has started to open.
    void Promise.all([
      bottomOf(viewport),
      bottomOf(field),
      revealTarget ? bottomOf(revealTarget) : Promise.resolve(-1),
    ]).then(([measuredViewportBottom, measuredFieldBottom, measuredTargetBottom]) => {
      startOffset.value = offset;
      viewportBottom.value = measuredViewportBottom;
      fieldBottom.value = Math.max(measuredFieldBottom, measuredTargetBottom);
    });
  }, [fieldBottom, scrollOffset, startOffset, viewportBottom]);

  // Measuring takes a few frames, so also measure as soon as a tap in the list
  // ends (once it has moved focus), ahead of the keyboard starting to open.
  const onViewportTouchEnd = useCallback(() => {
    requestAnimationFrame(measureFocusedField);
  }, [measureFocusedField]);

  useAnimatedReaction(
    () => keyboard.state.value,
    (state, previous) => {
      if (state === KeyboardState.OPENING && previous !== KeyboardState.OPENING) {
        runOnJS(measureFocusedField)();
      }
    },
  );

  useAnimatedReaction(
    () => keyboard.height.value,
    (height) => {
      const state = keyboard.state.value;
      if (
        fieldBottom.value < 0 ||
        (state !== KeyboardState.OPENING && state !== KeyboardState.OPEN)
      ) {
        return;
      }
      const covered = Math.max(0, height - bottomInset);
      const push = fieldBottom.value + FIELD_KEYBOARD_GAP - (viewportBottom.value - covered);
      if (push > 0) {
        scrollTo(scrollRef, 0, startOffset.value + push, false);
      }
    },
  );

  const viewportStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, keyboard.height.value - bottomInset),
  }));

  const onScrollOffsetChange = useCallback(
    (offset: number) => {
      scrollOffset.value = offset;
    },
    [scrollOffset],
  );

  return { onScrollOffsetChange, onViewportTouchEnd, scrollRef, viewportRef, viewportStyle };
}
