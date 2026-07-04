import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
  getEnrolledLevelAsync: jest.fn(async () => 2),
  // Values verified against expo-local-authentication@17.0.8
  // build/LocalAuthentication.types.js (NONE=0, SECRET=1, BIOMETRIC_WEAK=2, BIOMETRIC_STRONG=3).
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
}));

import * as LocalAuthentication from 'expo-local-authentication';

import {
  authenticateForAppLock,
  getAppLockCapability,
  isAppLockEnabled,
  setAppLockEnabled,
  shouldBypassAppLock,
} from '@/lib/appLock';

const mocked = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

beforeEach(async () => {
  await AsyncStorage.clear();
  mocked.hasHardwareAsync.mockResolvedValue(true);
  mocked.isEnrolledAsync.mockResolvedValue(true);
  mocked.authenticateAsync.mockResolvedValue({ success: true });
  mocked.getEnrolledLevelAsync.mockClear();
  mocked.getEnrolledLevelAsync.mockResolvedValue(
    LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK,
  );
});

test('lock defaults to disabled and can be toggled', async () => {
  expect(await isAppLockEnabled()).toBe(false);
  await setAppLockEnabled(true);
  expect(await isAppLockEnabled()).toBe(true);
  await setAppLockEnabled(false);
  expect(await isAppLockEnabled()).toBe(false);
});

test('capability is ready with hardware and enrollment', async () => {
  expect(await getAppLockCapability()).toBe('ready');
});

test('capability reports not-enrolled', async () => {
  mocked.isEnrolledAsync.mockResolvedValue(false);
  expect(await getAppLockCapability()).toBe('not-enrolled');
});

test('capability reports unsupported without hardware', async () => {
  mocked.hasHardwareAsync.mockResolvedValue(false);
  expect(await getAppLockCapability()).toBe('unsupported');
});

test('authenticateForAppLock returns the prompt result', async () => {
  expect(await authenticateForAppLock()).toBe(true);
  mocked.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
  expect(await authenticateForAppLock()).toBe(false);
});

test('authenticateForAppLock resolves false when the prompt throws', async () => {
  mocked.authenticateAsync.mockRejectedValue(new Error('no native module'));
  await expect(authenticateForAppLock()).resolves.toBe(false);
});

test('bypasses when lock disabled', async () => {
  expect(await shouldBypassAppLock()).toBe(true);
  expect(mocked.getEnrolledLevelAsync).not.toHaveBeenCalled();
});

test('keeps gate when enabled and authentication possible', async () => {
  await setAppLockEnabled(true);
  mocked.getEnrolledLevelAsync.mockResolvedValue(LocalAuthentication.SecurityLevel.SECRET);

  expect(await shouldBypassAppLock()).toBe(false);
  expect(await isAppLockEnabled()).toBe(true);
});

test('bypasses and auto-disables when authentication impossible', async () => {
  await setAppLockEnabled(true);
  mocked.getEnrolledLevelAsync.mockResolvedValue(LocalAuthentication.SecurityLevel.NONE);

  expect(await shouldBypassAppLock()).toBe(true);
  expect(await isAppLockEnabled()).toBe(false);
});

test('fails open when the enrollment probe throws', async () => {
  await setAppLockEnabled(true);
  mocked.getEnrolledLevelAsync.mockRejectedValue(new Error('no native module'));

  expect(await shouldBypassAppLock()).toBe(true);
  expect(await isAppLockEnabled()).toBe(true);
});
