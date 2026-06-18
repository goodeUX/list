import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { getPendingInviteListId } from '@/lib/pendingInvite';

export function useResumePendingInvite() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const resumedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || resumedRef.current) {
      return;
    }

    if (pathname.startsWith('/join/') || pathname === '/sign-in' || pathname === '/sign-up') {
      return;
    }

    void getPendingInviteListId().then((listId) => {
      if (!listId || resumedRef.current) {
        return;
      }

      resumedRef.current = true;
      router.push(`/join/${listId}`);
    });
  }, [loading, pathname, user]);
}
