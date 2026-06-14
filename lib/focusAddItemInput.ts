import { InteractionManager, Platform, type TextInput } from 'react-native';

import { focusTextInputNow } from '@/lib/focusTextInput';
import { hasKeyboardProxy, transferKeyboardFocus } from '@/lib/keyboardProxy';
import { SLIDE_IN_MS } from '@/lib/slideTransition';

const WEB_FOCUS_DELAYS_MS = [0, 16, 50, 100, 200, 350, 500];
const NATIVE_FOCUS_DELAYS_MS = [0, 16, 50, 150, 300, SLIDE_IN_MS + 50, SLIDE_IN_MS + 200];

function attemptAddItemInputFocus(
  input: TextInput | null | undefined,
): boolean {
  if (!input) {
    return false;
  }

  if (Platform.OS === 'web') {
    if (hasKeyboardProxy()) {
      return transferKeyboardFocus(input);
    }

    focusTextInputNow(input);
    return true;
  }

  focusTextInputNow(input);
  return true;
}

export function scheduleAddItemInputFocus(
  getInput: () => TextInput | null | undefined,
  onFocused?: () => void,
): void {
  let focused = false;

  const tryFocus = () => {
    if (focused) {
      return;
    }

    const input = getInput();
    if (!attemptAddItemInputFocus(input)) {
      return;
    }

    focused = true;
    onFocused?.();
  };

  const delays =
    Platform.OS === 'web' ? WEB_FOCUS_DELAYS_MS : NATIVE_FOCUS_DELAYS_MS;

  InteractionManager.runAfterInteractions(() => {
    for (const delay of delays) {
      setTimeout(tryFocus, delay);
    }
  });
}
