import { router } from 'expo-router';

import { goHome } from '@/lib/goHome';
import { getPendingInviteListId } from '@/lib/pendingInvite';

export async function navigateAfterSignIn(redirect?: string): Promise<void> {
  // Settings sends its sign-in and create-account buttons here with a
  // redirect of '/'. My Lists is already below Settings and the sign-in
  // screens, so go back to it rather than stacking another.
  if (redirect === '/') {
    goHome();
    return;
  }

  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    router.replace(redirect as '/');
    return;
  }

  const pendingListId = await getPendingInviteListId();
  if (pendingListId) {
    router.replace(`/join/${pendingListId}`);
    return;
  }

  goHome();
}
