import { router } from 'expo-router';

import { getPendingInviteListId } from '@/lib/pendingInvite';

export async function navigateAfterSignIn(redirect?: string): Promise<void> {
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    router.replace(redirect as '/');
    return;
  }

  const pendingListId = await getPendingInviteListId();
  if (pendingListId) {
    router.replace(`/join/${pendingListId}`);
    return;
  }

  router.replace('/');
}
