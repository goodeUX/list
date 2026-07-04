import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

import * as LocalAuthentication from 'expo-local-authentication';

import {
  authenticateForAppLock,
  getAppLockCapability,
  isAppLockEnabled,
  setAppLockEnabled,
} from '@/lib/appLock';

const mocked = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

beforeEach(async () => {
  await AsyncStorage.clear();
  mocked.hasHardwareAsync.mockResolvedValue(true);
  mocked.isEnrolledAsync.mockResolvedValue(true);
  mocked.authenticateAsync.mockResolvedValue({ success: true });
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
