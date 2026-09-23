import { normalizeItemName } from '@/lib/itemName';
import { renameSubItem } from '@/lib/subItems';
import type { ListItem, SubItem } from '@/lib/types';
import { isValidUrl, normalizeUrl } from '@/lib/urls';

// Pure helpers behind the item detail screen's auto-save: turning what the user
// has typed (a draft) into the value to store, and deciding when a stored value
// that changed should replace the draft.

export const ITEM_TEXT_FIELDS = ['name', 'quantity', 'description', 'link'] as const;
export type ItemTextField = (typeof ITEM_TEXT_FIELDS)[number];
export type StoredFieldValue = string | null;

export function storedFieldValue(item: ListItem, field: ItemTextField): StoredFieldValue {
  return field === 'name' ? item.name : (item[field] ?? null);
}

/** The value to store for a draft, or undefined when it can't be saved yet. */
export function savableFieldValue(
  field: ItemTextField,
  draft: string,
): StoredFieldValue | undefined {
  const trimmed = draft.trim();
  switch (field) {
    case 'name':
      // An item must keep a name.
      return normalizeItemName(draft) || undefined;
    case 'link':
      if (!trimmed) {
        return null;
      }
      return isValidUrl(trimmed) ? normalizeUrl(trimmed) : undefined;
    default:
      return trimmed || null;
  }
}

/**
 * The draft to show once the stored value changes. A draft that already saves
 * to the stored value is kept as typed, so the echo of our own save doesn't
 * strip a trailing space or rewrite a link mid-typing.
 */
export function draftAfterStoredChange(
  field: ItemTextField,
  draft: string,
  stored: StoredFieldValue,
): string {
  return savableFieldValue(field, draft) === stored ? draft : (stored ?? '');
}

export function withPendingSubItemRenames(
  subItems: SubItem[],
  renames: ReadonlyMap<string, string>,
): SubItem[] {
  let next = subItems;
  renames.forEach((name, id) => {
    next = renameSubItem(next, id, name);
  });
  return next;
}
