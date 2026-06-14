export const LIST_NAME_MAX_LENGTH = 35;
export const LIST_NAME_LIMIT_MESSAGE = 'Character limit reached';

export function limitListNameLength(value: string): string {
  return value.slice(0, LIST_NAME_MAX_LENGTH);
}

export function normalizeListName(value: string): string {
  return limitListNameLength(value.trim());
}

export function getListNameInputUpdate(text: string): {
  limitReached: boolean;
  value: string;
} {
  return {
    value: limitListNameLength(text),
    limitReached: text.length > LIST_NAME_MAX_LENGTH,
  };
}
