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
