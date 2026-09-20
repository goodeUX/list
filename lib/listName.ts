export const LIST_NAME_MAX_LENGTH = 35;

export function limitListNameLength(value: string): string {
  return value.slice(0, LIST_NAME_MAX_LENGTH);
}

export function normalizeListName(value: string): string {
  return limitListNameLength(value.trim());
}
