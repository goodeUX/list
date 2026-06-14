import type { TextInput } from 'react-native';

import { resolveTextInputElement } from '@/lib/textInputElement';

const PROXY_ID = 'list-keyboard-proxy';

let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function getProxyInput(): HTMLInputElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.getElementById(PROXY_ID) as HTMLInputElement | null;
}

export function hasKeyboardProxy(): boolean {
  return getProxyInput() !== null;
}

export function acquireKeyboardSession(): void {
  if (typeof document === 'undefined') {
    return;
  }

  let proxy = getProxyInput();
  if (!proxy) {
    proxy = document.createElement('input');
    proxy.id = PROXY_ID;
    proxy.type = 'text';
    proxy.setAttribute('autocomplete', 'off');
    proxy.setAttribute('autocapitalize', 'off');
    proxy.setAttribute('aria-hidden', 'true');
    proxy.setAttribute('tabindex', '-1');
    Object.assign(proxy.style, {
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: '1px',
      height: '1px',
      opacity: '0',
      border: '0',
      padding: '0',
      margin: '0',
      pointerEvents: 'none',
    });
    document.body.prepend(proxy);
  }

  proxy.focus({ preventScroll: true });
  scheduleSafetyRelease();
}

export function renewKeyboardSession(): void {
  if (!hasKeyboardProxy()) {
    return;
  }

  scheduleSafetyRelease();
}

export function transferKeyboardFocus(
  input: TextInput | null | undefined,
): boolean {
  const element = resolveTextInputElement(input);

  if (!element && !input) {
    return false;
  }

  if (element) {
    element.focus({ preventScroll: true });

    const length = element.value.length;
    element.setSelectionRange?.(length, length);
  } else {
    input?.focus();
  }

  releaseKeyboardProxy();
  return true;
}

export function releaseKeyboardProxy(): void {
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }

  getProxyInput()?.remove();
}

function scheduleSafetyRelease(ms = 15000): void {
  if (safetyTimer) {
    clearTimeout(safetyTimer);
  }

  safetyTimer = setTimeout(() => {
    releaseKeyboardProxy();
    safetyTimer = null;
  }, ms);
}
