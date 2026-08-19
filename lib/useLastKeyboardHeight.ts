import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Height of the most recently shown soft keyboard, in dp.
 *
 * Cached at module scope because the keyboard is dismissed before the emoji
 * sheet opens — without a remembered value the sheet would have nothing to
 * match on the frame it appears. 0 until a keyboard has been seen at least once.
 */
let cachedKeyboardHeight = 0;

export function useLastKeyboardHeight(): number {
  const [height, setHeight] = useState(cachedKeyboardHeight);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const next = event.endCoordinates.height;

      if (next > 0 && next !== cachedKeyboardHeight) {
        cachedKeyboardHeight = next;
        setHeight(next);
      }
    });

    return () => subscription.remove();
  }, []);

  return height;
}
