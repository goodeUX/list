import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  compareHistoryUsefulness,
  foldItemName,
  type ListHistoryEntry,
} from '@/lib/itemSuggestions';

const KEY_PREFIX = 'list_app_list_item_history_v1:';

/** Names kept per list before the least useful ones are dropped. */
export const MAX_LIST_HISTORY_ENTRIES = 500;

type StoredEntry = {
  name: string;
  useCount: number;
  lastUsedAt: string;
};

/** Entries stay newest-first so ties are pruned oldest-first. */
const cache = new Map<string, ListHistoryEntry[]>();

function storageKey(listId: string): string {
  return `${KEY_PREFIX}${listId}`;
}

function toEntry(stored: StoredEntry): ListHistoryEntry {
  const lastUsedAt = new Date(stored.lastUsedAt);

  return {
    lastUsedAt: Number.isNaN(lastUsedAt.getTime()) ? new Date() : lastUsedAt,
    name: stored.name,
    useCount: stored.useCount,
  };
}

function toStored(entry: ListHistoryEntry): StoredEntry {
  return {
    lastUsedAt: entry.lastUsedAt.toISOString(),
    name: entry.name,
    useCount: entry.useCount,
  };
}

async function readHistory(listId: string): Promise<ListHistoryEntry[]> {
  const cached = cache.get(listId);
  if (cached) {
    return cached;
  }

  const raw = await AsyncStorage.getItem(storageKey(listId));
  let entries: ListHistoryEntry[] = [];

  if (raw) {
    try {
      entries = (JSON.parse(raw) as StoredEntry[]).map(toEntry);
    } catch {
      entries = [];
    }
  }

  cache.set(listId, entries);
  return entries;
}

/**
 * Keeps the most useful names: highest use count first, then most recent. The
 * sort is stable and entries are newest-first, so equally-used names lose the
 * oldest one.
 */
function prune(entries: ListHistoryEntry[]): ListHistoryEntry[] {
  if (entries.length <= MAX_LIST_HISTORY_ENTRIES) {
    return entries;
  }

  return [...entries]
    .sort(compareHistoryUsefulness)
    .slice(0, MAX_LIST_HISTORY_ENTRIES);
}

async function writeHistory(
  listId: string,
  entries: ListHistoryEntry[],
): Promise<void> {
  const pruned = prune(entries);
  cache.set(listId, pruned);
  await AsyncStorage.setItem(
    storageKey(listId),
    JSON.stringify(pruned.map(toStored)),
  );
}

export async function getLocalListHistory(
  listId: string,
): Promise<ListHistoryEntry[]> {
  const entries = await readHistory(listId);
  return entries.map((entry) => ({ ...entry }));
}

export async function recordLocalListName(
  listId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!listId || !trimmed) {
    return;
  }

  const folded = foldItemName(trimmed);
  const entries = await readHistory(listId);
  const existing = entries.find((entry) => foldItemName(entry.name) === folded);
  const now = new Date();

  const next = entries.filter((entry) => entry !== existing);
  next.unshift({
    lastUsedAt: now,
    // The first spelling wins, so a stray lowercase entry does not rename it.
    name: existing?.name ?? trimmed,
    useCount: (existing?.useCount ?? 0) + 1,
  });

  await writeHistory(listId, next);
}

export async function seedLocalListHistory(
  listId: string,
  names: string[],
): Promise<void> {
  if (!listId) {
    return;
  }

  const entries = await readHistory(listId);
  if (entries.length > 0) {
    return;
  }

  const now = new Date();
  const seen = new Set<string>();
  const seeded: ListHistoryEntry[] = [];

  for (const name of names) {
    const trimmed = name.trim();
    const folded = foldItemName(trimmed);
    if (!folded || seen.has(folded)) {
      continue;
    }

    seen.add(folded);
    seeded.unshift({ lastUsedAt: now, name: trimmed, useCount: 1 });
  }

  if (seeded.length === 0) {
    return;
  }

  await writeHistory(listId, seeded);
}

export async function deleteLocalListHistory(listId: string): Promise<void> {
  if (!listId) {
    return;
  }

  cache.delete(listId);
  await AsyncStorage.removeItem(storageKey(listId));
}
