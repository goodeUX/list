import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { foldItemName, type ListHistoryEntry } from '@/lib/itemSuggestions';
import {
  fetchListItemHistory,
  pruneListItemHistory,
  recordListItemName,
  seedListItemHistory,
} from '@/lib/listItemHistory';
import type { ListItem } from '@/lib/types';

interface Options {
  items: ListItem[];
  itemsLoading: boolean;
}

/**
 * Every name this list has held, for the add-item suggestions.
 *
 * Fetched once when the list opens rather than through a live listener:
 * suggestions do not need to be realtime, and a listener would hold an open
 * read on every list the user visits.
 */
export function useListItemHistory(
  listId: string | undefined,
  { items, itemsLoading }: Options,
) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ListHistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const entriesRef = useRef<ListHistoryEntry[]>([]);
  const itemsRef = useRef<ListItem[]>(items);
  const seededListIdRef = useRef<string | null>(null);

  itemsRef.current = items;

  const applyEntries = useCallback((next: ListHistoryEntry[]) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);

  useEffect(() => {
    let active = true;
    applyEntries([]);
    setLoaded(false);

    if (!listId) {
      return;
    }

    void fetchListItemHistory(listId, user)
      .then((fetched) => {
        if (active) {
          applyEntries(fetched);
          setLoaded(true);
        }
      })
      .catch(() => {
        // Deliberately leaves `loaded` false: a failed read must not look like
        // an empty history, or seeding would overwrite what is really there.
      });

    return () => {
      active = false;
    };
  }, [applyEntries, listId, user]);

  // A list that predates this feature has no history, so seed it from what it
  // holds right now. Once seeded the history is no longer empty, which stops
  // this from running again.
  useEffect(() => {
    if (!listId || !loaded || itemsLoading || entriesRef.current.length > 0) {
      return;
    }

    if (seededListIdRef.current === listId) {
      return;
    }

    const names = itemsRef.current.map((item) => item.name).filter(Boolean);
    if (names.length === 0) {
      return;
    }

    seededListIdRef.current = listId;
    const seededAt = new Date();

    void seedListItemHistory(listId, user, names)
      .then(() => {
        if (entriesRef.current.length > 0) {
          return;
        }

        const seen = new Set<string>();
        const seeded: ListHistoryEntry[] = [];

        for (const name of names) {
          const folded = foldItemName(name);
          if (!folded || seen.has(folded)) {
            continue;
          }
          seen.add(folded);
          seeded.push({ lastUsedAt: seededAt, name: name.trim(), useCount: 1 });
        }

        applyEntries(seeded);
      })
      .catch(() => {
        seededListIdRef.current = null;
      });
  }, [applyEntries, itemsLoading, listId, loaded, user]);

  /** Counts one use of a name, creating its history entry when it is new. */
  const recordName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!listId || !trimmed) {
        return;
      }

      const folded = foldItemName(trimmed);
      const existing = entriesRef.current.find(
        (entry) => foldItemName(entry.name) === folded,
      );
      const now = new Date();

      const next = entriesRef.current.filter((entry) => entry !== existing);
      next.unshift({
        lastUsedAt: now,
        name: existing?.name ?? trimmed,
        useCount: (existing?.useCount ?? 0) + 1,
      });
      applyEntries(next);

      try {
        await recordListItemName(listId, user, trimmed, Boolean(existing));
        const kept = await pruneListItemHistory(listId, user, next);
        if (kept.length !== next.length) {
          applyEntries(kept);
        }
      } catch {
        // Suggestions are a convenience: a failed history write must never
        // interfere with adding the item itself.
      }
    },
    [applyEntries, listId, user],
  );

  return { entries, recordName };
}
