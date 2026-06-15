import { Keyboard, type TextInput } from 'react-native';

export function dismissKeyboard(input?: TextInput | null): void {
  input?.blur();
  Keyboard.dismiss();
}
