import type { TextInput } from 'react-native';

export function acquireKeyboardSession(): void {}

export function hasKeyboardProxy(): boolean {
  return false;
}

export function renewKeyboardSession(): void {}

export function transferKeyboardFocus(
  _input: TextInput | null | undefined,
): boolean {
  return false;
}

export function releaseKeyboardProxy(): void {}
