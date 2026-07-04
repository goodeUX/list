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

/**
 * True when the gate must be skipped: lock disabled, or the lock can no longer
 * be satisfied (nothing enrolled and no device credential) — in which case the
 * lock is switched off so the user is never locked out.
 */
export async function shouldBypassAppLock(): Promise<boolean> {
  if (!(await isAppLockEnabled())) {
    return true;
  }

  let level: LocalAuthentication.SecurityLevel;
  try {
    level = await LocalAuthentication.getEnrolledLevelAsync();
  } catch {
    // Probe unavailable — fail open for this launch, keep the preference.
    return true;
  }

  if (level === LocalAuthentication.SecurityLevel.NONE) {
    await setAppLockEnabled(false);
    return true;
  }

  return false;
}

export async function authenticateForAppLock(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock List Kitty',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch {
    // Treat prompt failures (e.g. missing native module) as a failed unlock
    // rather than crashing the gate.
    return false;
  }
}
