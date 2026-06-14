import type { TextInput } from 'react-native';

export function resolveTextInputElement(
  input: TextInput | null | undefined,
): HTMLInputElement | null {
  if (!input) {
    return null;
  }

  const candidate =
    (input as TextInput & { _node?: HTMLInputElement })._node ??
    (input as unknown as HTMLInputElement);

  if (
    candidate &&
    typeof candidate.focus === 'function' &&
    'value' in candidate
  ) {
    return candidate as HTMLInputElement;
  }

  return null;
}
