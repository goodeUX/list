export const ITEM_NAME_MAX_LENGTH = 50;
export const ITEM_NAME_DISPLAY_MAX_LENGTH = 35;
export const ITEM_NAME_LIMIT_MESSAGE = 'Character limit reached';

export function limitItemNameLength(value: string): string {
  return value.slice(0, ITEM_NAME_MAX_LENGTH);
}

export function normalizeItemName(value: string): string {
  return limitItemNameLength(value.trim());
}

export function formatItemNameForDisplay(name: string): string {
  if (name.length <= ITEM_NAME_DISPLAY_MAX_LENGTH) {
    return name;
  }

  return `${name.slice(0, ITEM_NAME_DISPLAY_MAX_LENGTH)}…`;
}

export function getItemNameInputUpdate(text: string): {
  limitReached: boolean;
  value: string;
} {
  return {
    value: limitItemNameLength(text),
    limitReached: text.length > ITEM_NAME_MAX_LENGTH,
  };
}

/**
 * Normalized key for deciding whether two item names are "the same thing"
 * when merging. Case-insensitive with a simple single-trailing-`s` plural
 * fold (orange = oranges). `-es` plurals (boxes, tomatoes) are not folded in
 * v1; those simply won't merge, which is acceptable.
 */
export function itemMatchKey(name: string): string {
  const base = name.trim().toLowerCase();
  if (base.length > 2 && base.endsWith('s')) {
    return base.slice(0, -1);
  }
  return base;
}
