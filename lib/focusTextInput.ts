import { InteractionManager, Platform, type TextInput } from 'react-native';

import { resolveTextInputElement } from '@/lib/textInputElement';

function invokeFocus(input: TextInput) {
  input.focus();

  const element = resolveTextInputElement(input);
  element?.click?.();

  const length = element?.value.length ?? 0;
  element?.setSelectionRange?.(length, length);
}

export function focusTextInputNow(input: TextInput | null | undefined) {
  if (!input) {
    return;
  }

  invokeFocus(input);
}

export function scheduleTextInputFocus(input: TextInput | null | undefined) {
  if (!input) {
    return;
  }

  const focus = () => invokeFocus(input);

  InteractionManager.runAfterInteractions(() => {
    if (Platform.OS === 'web') {
      requestAnimationFrame(focus);
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        focus();

        if (Platform.OS === 'android') {
          setTimeout(focus, 100);
          setTimeout(focus, 300);
        } else {
          setTimeout(focus, 50);
        }
      });
    });
  });
}
