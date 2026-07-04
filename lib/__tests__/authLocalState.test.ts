import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getJourneyDefault,
  getLastAccountHint,
  recordAppUsed,
  recordSignIn,
} from '@/lib/authLocalState';

jest.mock('@/lib/localStore', () => ({
  getLocalLists: jest.fn(async () => []),
}));

const { getLocalLists } = jest.requireMock('@/lib/localStore') as {
  getLocalLists: jest.Mock;
};

beforeEach(async () => {
  await AsyncStorage.clear();
  getLocalLists.mockResolvedValue([]);
});

test('fresh install defaults to sign-up', async () => {
  expect(await getJourneyDefault()).toBe('sign-up');
});

test('after recordAppUsed defaults to sign-in', async () => {
  await recordAppUsed();
  expect(await getJourneyDefault()).toBe('sign-in');
});

test('existing local lists count as prior usage', async () => {
  getLocalLists.mockResolvedValue([{ id: 'a' }]);
  expect(await getJourneyDefault()).toBe('sign-in');
});

test('recordSignIn stores the hint and marks usage', async () => {
  await recordSignIn('Geoff Goode', 'geoff@example.com');
  expect(await getLastAccountHint()).toEqual({
    displayName: 'Geoff Goode',
    email: 'geoff@example.com',
  });
  expect(await getJourneyDefault()).toBe('sign-in');
});

test('hint is null when never signed in', async () => {
  expect(await getLastAccountHint()).toBeNull();
});
