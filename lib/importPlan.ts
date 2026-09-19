import { nextItemOrder } from '@/lib/listItemOrdering';
import { planItemMerges } from '@/lib/mergeItems';
import type { ParsedEntry } from '@/lib/parseItemEntries';
import type { ListItem } from '@/lib/types';

export type ImportWrite =
  | { type: 'add'; name: string; quantity: string | null; order: number }
  | { type: 'update'; id: string; quantity: string | null };

/**
 * Turn merged entries into an ordered list of write actions against an existing
 * list. Pure: no Firebase, so it is unit-testable on its own. `entries` must
 * already be merged (via mergeEntries). Mirrors the batch-order arithmetic from
 * `addOrMergeItems` (`order = base - (addCount - 1 - i)`), so imported items
 * keep recipe order top→bottom.
 */
export function planImportWrites(
  entries: ParsedEntry[],
  existing: ListItem[],
): ImportWrite[] {
  const actions = planItemMerges(entries, existing);
  const base = nextItemOrder(existing);
  const addCount = actions.filter((a) => a.type === 'add').length;
  let addIndex = 0;
  return actions.map((action) => {
    if (action.type === 'update') {
      return { type: 'update', id: action.id, quantity: action.quantity };
    }
    const order = base - (addCount - 1 - addIndex);
    addIndex += 1;
    return { type: 'add', name: action.name, quantity: action.quantity, order };
  });
}
