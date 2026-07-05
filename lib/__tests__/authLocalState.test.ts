import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getJourneyDefault,
  getLastAccountHint,
  hasSeenListsIntro,
  markListsIntroSeen,
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

test('malformed hint JSON yields null', async () => {
  await AsyncStorage.setItem('auth.lastAccountHint', '{not json');
  expect(await getLastAccountHint()).toBeNull();
});

test('array hint JSON yields null', async () => {
  await AsyncStorage.setItem('auth.lastAccountHint', '["not","a","hint"]');
  expect(await getLastAccountHint()).toBeNull();
});

test('recordSignIn drops blank fields', async () => {
  await recordSignIn('  ', 'geoff@example.com');
  expect(await getLastAccountHint()).toEqual({ email: 'geoff@example.com' });
});

test('unreadable local store falls back to sign-up', async () => {
  getLocalLists.mockRejectedValue(new Error('boom'));
  expect(await getJourneyDefault()).toBe('sign-up');
});

test('lists intro is unseen on a fresh install', async () => {
  expect(await hasSeenListsIntro()).toBe(false);
});

test('lists intro reads as seen after being marked', async () => {
  await markListsIntroSeen();
  expect(await hasSeenListsIntro()).toBe(true);
});
