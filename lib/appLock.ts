import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const APP_LOCK_KEY = 'appLock.enabled';

export type AppLockCapability = 'ready' | 'not-enrolled' | 'unsupported';

export async function isAppLockEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(APP_LOCK_KEY)) === '1';
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(APP_LOCK_KEY, '1');
    return;
  }

  await AsyncStorage.removeItem(APP_LOCK_KEY);
}

export async function getAppLockCapability(): Promise<AppLockCapability> {
  if (Platform.OS === 'web') {
    return 'unsupported';
  }

  if (!(await LocalAuthentication.hasHardwareAsync())) {
    return 'unsupported';
  }

  if (!(await LocalAuthentication.isEnrolledAsync())) {
    return 'not-enrolled';
  }

  return 'ready';
}

export async function authenticateForAppLock(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock List Kitty',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });

  return result.success;
}
