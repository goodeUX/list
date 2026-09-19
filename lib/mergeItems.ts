import { itemMatchKey } from './itemName';
import type { ParsedEntry } from './parseItemEntries';
import {
  combineItemQuantities,
  formatQuantity,
  parseQuantity,
} from './quantity';
import type { ListItem } from './types';

export type MergeAction =
  | { type: 'add'; name: string; quantity: string | null }
  | { type: 'update'; id: string; quantity: string | null };

export function planItemMerges(
  entries: ParsedEntry[],
  items: ListItem[],
): MergeAction[] {
  const activeByKey = new Map<string, ListItem>();
  for (const item of items) {
    if (item.checked) {
      continue;
    }
    const key = itemMatchKey(item.name);
    if (!activeByKey.has(key)) {
      activeByKey.set(key, item);
    }
  }

  const actions: MergeAction[] = [];

  for (const entry of entries) {
    const key = itemMatchKey(entry.name);
    const existing = activeByKey.get(key);

    if (existing) {
      const raw = existing.quantity?.trim() ?? '';
      const existingQuantity = raw ? parseQuantity(raw) : null;
      const unparseable = raw !== '' && existingQuantity === null;

      if (!unparseable) {
        const combined = combineItemQuantities(existingQuantity, entry.quantity);
        if (combined.merged) {
          activeByKey.delete(key);
          actions.push({
            type: 'update',
            id: existing.id,
            quantity: formatQuantity(combined.quantity),
          });
          continue;
        }
      }
    }

    actions.push({
      type: 'add',
      name: entry.name,
      quantity: entry.quantity ? formatQuantity(entry.quantity) : null,
    });
  }

  return actions;
}
