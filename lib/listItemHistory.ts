import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { historyDocId } from '@/lib/historyDocId';
import {
  compareHistoryUsefulness,
  foldItemName,
  type ListHistoryEntry,
} from '@/lib/itemSuggestions';
import { usesCloudListData } from '@/lib/listIds';
import {
  deleteLocalListHistory,
  getLocalListHistory,
  MAX_LIST_HISTORY_ENTRIES,
  recordLocalListName,
  seedLocalListHistory,
} from '@/lib/localListHistory';

function historyCollection(listId: string) {
  return collection(db, 'lists', listId, 'itemHistory');
}

function toDate(value: unknown): Date {
  return value instanceof Timestamp ? value.toDate() : new Date();
}

/** Every name this list has held, unordered — the caller ranks them. */
export async function fetchListItemHistory(
  listId: string,
  user: User | null,
): Promise<ListHistoryEntry[]> {
  if (!listId) {
    return [];
  }

  if (!usesCloudListData(user, listId)) {
    return getLocalListHistory(listId);
  }

  const snapshot = await getDocs(historyCollection(listId));

  return snapshot.docs.map((entryDoc) => {
    const data = entryDoc.data();
    return {
      lastUsedAt: toDate(data.lastUsedAt),
      name: (data.name as string) ?? '',
      useCount: (data.useCount as number) ?? 1,
    };
  });
}

/**
 * Records one use of a name. `isKnownName` says whether the caller already has
 * an entry for it, which decides whether the stored spelling is written: the
 * first spelling of a name wins, so later casing does not rewrite it.
 */
export async function recordListItemName(
  listId: string,
  user: User | null,
  name: string,
  isKnownName: boolean,
): Promise<void> {
  const trimmed = name.trim();
  if (!listId || !trimmed) {
    return;
  }

  if (!usesCloudListData(user, listId)) {
    await recordLocalListName(listId, trimmed);
    return;
  }

  const entryRef = doc(historyCollection(listId), historyDocId(trimmed));

  await setDoc(
    entryRef,
    {
      // increment() creates the field at 1 when the doc is new, so a
      // collaborator writing the same name concurrently cannot lose a count.
      lastUsedAt: serverTimestamp(),
      useCount: increment(1),
      ...(isKnownName ? {} : { name: trimmed }),
    },
    { merge: true },
  );
}

/** Fills a list history from the names already on the list. */
export async function seedListItemHistory(
  listId: string,
  user: User | null,
  names: string[],
): Promise<void> {
  if (!listId || names.length === 0) {
    return;
  }

  if (!usesCloudListData(user, listId)) {
    await seedLocalListHistory(listId, names);
    return;
  }

  const seen = new Set<string>();
  const batch = writeBatch(db);
  let queued = 0;

  for (const name of names) {
    const trimmed = name.trim();
    const folded = foldItemName(trimmed);
    if (!folded || seen.has(folded)) {
      continue;
    }

    seen.add(folded);
    batch.set(doc(historyCollection(listId), historyDocId(trimmed)), {
      lastUsedAt: serverTimestamp(),
      name: trimmed,
      useCount: 1,
    });
    queued += 1;
  }

  if (queued > 0) {
    await batch.commit();
  }
}

/**
 * Copies a local list history onto a freshly created cloud list, keeping the
 * counts and dates it had built up while signed out.
 */
export async function copyListItemHistoryToCloud(
  listId: string,
  entries: ListHistoryEntry[],
): Promise<void> {
  if (!listId || entries.length === 0) {
    return;
  }

  const batch = writeBatch(db);

  for (const entry of entries) {
    batch.set(doc(historyCollection(listId), historyDocId(entry.name)), {
      lastUsedAt: Timestamp.fromDate(entry.lastUsedAt),
      name: entry.name,
      useCount: entry.useCount,
    });
  }

  await batch.commit();
}

/**
 * Drops the least useful names once a list passes the cap, and returns the
 * entries that were kept.
 */
export async function pruneListItemHistory(
  listId: string,
  user: User | null,
  entries: ListHistoryEntry[],
): Promise<ListHistoryEntry[]> {
  if (entries.length <= MAX_LIST_HISTORY_ENTRIES) {
    return entries;
  }

  const ranked = [...entries].sort(compareHistoryUsefulness);
  const kept = ranked.slice(0, MAX_LIST_HISTORY_ENTRIES);

  // Local histories prune themselves as they are written.
  if (usesCloudListData(user, listId)) {
    const dropped = ranked.slice(MAX_LIST_HISTORY_ENTRIES);
    await Promise.all(
      dropped.map((entry) =>
        deleteDoc(doc(historyCollection(listId), historyDocId(entry.name))),
      ),
    );
  }

  return kept;
}

export async function deleteListItemHistory(
  listId: string,
  user: User | null,
): Promise<void> {
  if (!listId) {
    return;
  }

  if (!usesCloudListData(user, listId)) {
    await deleteLocalListHistory(listId);
    return;
  }

  const snapshot = await getDocs(historyCollection(listId));
  await Promise.all(snapshot.docs.map((entryDoc) => deleteDoc(entryDoc.ref)));
}
