import { useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';
import { useLists } from '@/hooks/useLists';
import { isListEditable, resolveEditableListIds } from '@/lib/listLimits';
import { usesCloudListData } from '@/lib/listIds';

/**
 * Whether a list is read-only for the current user: free plan, over the cap
 * (post-downgrade), and this list isn't one of their picked editable lists.
 * Local lists and premium accounts are never read-only.
 */
export function useListAccess(listId: string | undefined): { readOnly: boolean } {
  const { user } = useAuth();
  const { plan, planReady, activeListIds } = usePlan();
  const { lists, loading } = useLists();

  return useMemo(() => {
    if (!user || !listId || !usesCloudListData(user, listId) || !planReady || loading) {
      return { readOnly: false };
    }

    const listIds = lists.map((list) => list.id);
    if (!listIds.includes(listId)) {
      return { readOnly: false };
    }

    const editable = resolveEditableListIds(plan, listIds, activeListIds);
    return { readOnly: !isListEditable(listId, editable) };
  }, [activeListIds, listId, lists, loading, plan, planReady, user]);
}
