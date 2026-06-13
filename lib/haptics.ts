import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function playToggleHaptic(): void {
  if (Platform.OS === 'web') {
    return;
  }

  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function playAddItemHaptic(): void {
  if (Platform.OS === 'web') {
    return;
  }

  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function playDeleteItemHaptic(): void {
  if (Platform.OS === 'web') {
    return;
  }

  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
