import type { AppList } from '@/lib/types';

export type ListSortMode = 'alphabetical' | 'recent' | 'custom';

/** Matches the order lists arrived in before this preference existed. */
export const DEFAULT_SORT_MODE: ListSortMode = 'recent';

const SORT_MODES: readonly ListSortMode[] = ['alphabetical', 'recent', 'custom'];

export function isListSortMode(value: unknown): value is ListSortMode {
  return typeof value === 'string' && SORT_MODES.includes(value as ListSortMode);
}

export function isCustomOrder(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function byRecent(a: AppList, b: AppList): number {
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

function byName(a: AppList, b: AppList): number {
  const compared = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  return compared !== 0 ? compared : byRecent(a, b);
}

/**
 * The order lists are shown in on the home screen.
 *
 * `customOrder` is a per-user list of ids. Lists missing from it — just
 * created, or just shared with this user — sort to the TOP (most recent
 * first) so they can't land off-screen below a long saved arrangement.
 * Ids in `customOrder` with no matching list are ignored.
 */
export function sortLists(
  lists: AppList[],
  mode: ListSortMode,
  customOrder: string[],
): AppList[] {
  const sorted = [...lists];

  if (mode === 'alphabetical') {
    return sorted.sort(byName);
  }

  if (mode === 'recent') {
    return sorted.sort(byRecent);
  }

  const rank = new Map(customOrder.map((id, index) => [id, index]));

  return sorted.sort((a, b) => {
    const rankA = rank.get(a.id);
    const rankB = rank.get(b.id);

    if (rankA === undefined && rankB === undefined) {
      return byRecent(a, b);
    }
    if (rankA === undefined) {
      return -1;
    }
    if (rankB === undefined) {
      return 1;
    }
    return rankA - rankB;
  });
}

/** The id order to persist after a drag, taken from the displayed order. */
export function customOrderFrom(lists: AppList[]): string[] {
  return lists.map((list) => list.id);
}

/** Drops ids whose list is gone, so the saved order can't grow forever. */
export function pruneCustomOrder(order: string[], lists: AppList[]): string[] {
  const live = new Set(lists.map((list) => list.id));
  return order.filter((id) => live.has(id));
}
