import { useCallback, useSyncExternalStore } from 'react';

import {
  isSubItemsExpanded,
  loadExpandedSubItems,
  setSubItemsExpanded,
  subscribeExpandedSubItems,
} from '@/lib/subItemExpansion';

// Start reading the stored preference as soon as the app loads, so it's in
// memory before the first list page renders.
void loadExpandedSubItems();

/** Whether an item's sub-items are shown on the list page, and a toggle. */
export function useSubItemsExpanded(itemId: string) {
  const expanded = useSyncExternalStore(subscribeExpandedSubItems, () =>
    isSubItemsExpanded(itemId),
  );
  const toggle = useCallback(() => {
    setSubItemsExpanded(itemId, !isSubItemsExpanded(itemId));
  }, [itemId]);
  return [expanded, toggle] as const;
}
