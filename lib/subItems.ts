import { limitItemNameLength } from '@/lib/itemName';
import type { SubItem } from '@/lib/types';

export function createSubItemId(): string {
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeSubItemName(value: string): string {
  return limitItemNameLength(value.trim());
}

export function sortSubItems(subItems: SubItem[]): SubItem[] {
  return [...subItems].sort((a, b) => a.order - b.order);
}

function resequence(subItems: SubItem[]): SubItem[] {
  return sortSubItems(subItems).map((subItem, index) =>
    subItem.order === index ? subItem : { ...subItem, order: index },
  );
}

export function parseSubItems(value: unknown): SubItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: SubItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.name !== 'string') {
      continue;
    }
    parsed.push({
      id: record.id,
      name: record.name,
      checked: record.checked === true,
      order: parsed.length,
    });
  }

  return resequence(parsed);
}

export function addSubItem(
  subItems: SubItem[],
  name: string,
  id: string = createSubItemId(),
): SubItem[] {
  const normalized = normalizeSubItemName(name);
  if (!normalized) {
    return subItems;
  }

  const ordered = sortSubItems(subItems);
  return [
    ...ordered,
    { id, name: normalized, checked: false, order: ordered.length },
  ];
}

export function removeSubItem(subItems: SubItem[], id: string): SubItem[] {
  return resequence(subItems.filter((subItem) => subItem.id !== id));
}

export function renameSubItem(
  subItems: SubItem[],
  id: string,
  name: string,
): SubItem[] {
  const normalized = normalizeSubItemName(name);
  if (!normalized) {
    return subItems;
  }

  return subItems.map((subItem) =>
    subItem.id === id ? { ...subItem, name: normalized } : subItem,
  );
}

export function toggleSubItem(subItems: SubItem[], id: string): SubItem[] {
  return subItems.map((subItem) =>
    subItem.id === id ? { ...subItem, checked: !subItem.checked } : subItem,
  );
}

export function reorderSubItems(
  subItems: SubItem[],
  orderedIds: string[],
): SubItem[] {
  const byId = new Map(subItems.map((subItem) => [subItem.id, subItem]));
  const reordered: SubItem[] = [];

  orderedIds.forEach((id) => {
    const subItem = byId.get(id);
    if (subItem) {
      reordered.push({ ...subItem, order: reordered.length });
      byId.delete(id);
    }
  });

  sortSubItems([...byId.values()]).forEach((subItem) => {
    reordered.push({ ...subItem, order: reordered.length });
  });

  return reordered;
}

export function subItemsEqual(a: SubItem[], b: SubItem[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (
      left.id !== right.id ||
      left.name !== right.name ||
      left.checked !== right.checked ||
      left.order !== right.order
    ) {
      return false;
    }
  }
  return true;
}

export function subItemProgress(subItems: SubItem[]): {
  done: number;
  total: number;
} {
  return {
    done: subItems.filter((subItem) => subItem.checked).length,
    total: subItems.length,
  };
}
