import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLocalLists } from '@/lib/localStore';

const HAS_USED_KEY = 'auth.hasUsedBefore';
const ACCOUNT_HINT_KEY = 'auth.lastAccountHint';
const LISTS_INTRO_SEEN_KEY = 'onboarding.listsIntroSeen';

export type AuthJourneyMode = 'sign-in' | 'sign-up';

export type AccountHint = {
  displayName?: string;
  email?: string;
};

export async function recordAppUsed(): Promise<void> {
  await AsyncStorage.setItem(HAS_USED_KEY, '1');
}

/** Stores the welcome-back hint. Deliberately survives sign-out. */
export async function recordSignIn(
  displayName: string | null | undefined,
  email: string | null | undefined,
): Promise<void> {
  const hint: AccountHint = {};
  const trimmedName = displayName?.trim();
  const trimmedEmail = email?.trim();
  if (trimmedName) {
    hint.displayName = trimmedName;
  }
  if (trimmedEmail) {
    hint.email = trimmedEmail;
  }

  await AsyncStorage.multiSet([
    [HAS_USED_KEY, '1'],
    [ACCOUNT_HINT_KEY, JSON.stringify(hint)],
  ]);
}

export async function getLastAccountHint(): Promise<AccountHint | null> {
  const raw = await AsyncStorage.getItem(ACCOUNT_HINT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AccountHint;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/** Whether the signed-out user has already seen the My Lists sign-in intro. */
export async function hasSeenListsIntro(): Promise<boolean> {
  return (await AsyncStorage.getItem(LISTS_INTRO_SEEN_KEY)) === '1';
}

/** Records that the My Lists sign-in intro has been shown, so it never repeats. */
export async function markListsIntroSeen(): Promise<void> {
  await AsyncStorage.setItem(LISTS_INTRO_SEEN_KEY, '1');
}

/** Signup for brand-new users; login for anyone with prior usage on this device. */
export async function getJourneyDefault(): Promise<AuthJourneyMode> {
  if ((await AsyncStorage.getItem(HAS_USED_KEY)) === '1') {
    return 'sign-in';
  }

  try {
    const lists = await getLocalLists();
    if (lists.length > 0) {
      return 'sign-in';
    }
  } catch {
    // Local store unreadable — treat as fresh.
  }

  return 'sign-up';
}
