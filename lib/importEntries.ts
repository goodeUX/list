import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { db } from '@/lib/firebase';
import {
  addItemToList,
  docToListItem,
  isOptimisticListItem,
} from '@/hooks/useListItems';
import { planImportWrites, type ImportWrite } from '@/lib/importPlan';
import { normalizeItemName } from '@/lib/itemName';
import { usesCloudListData } from '@/lib/listIds';
import { getLocalItems, updateLocalItem } from '@/lib/localStore';
import { mergeEntries } from '@/lib/parseItemEntries';
import type { ParsedEntry } from '@/lib/parseItemEntries';
import type { ListItem } from '@/lib/types';

export { planImportWrites };
export type { ImportWrite };

async function readListItems(listId: string, user: User | null): Promise<ListItem[]> {
  if (!usesCloudListData(user, listId)) {
    return getLocalItems(listId);
  }
  const snapshot = await getDocs(
    query(collection(db, 'lists', listId, 'items'), orderBy('order')),
  );
  return snapshot.docs.map((docSnap) => docToListItem(docSnap.id, docSnap.data()));
}

/**
 * Merge parsed entries into a list that may not be the one currently on screen.
 * Combines duplicates, sums into matching active items, and writes through the
 * same cloud/local paths used elsewhere. Returns the normalized entry names.
 */
export async function applyEntriesToList(
  listId: string,
  user: User | null,
  rawEntries: ParsedEntry[],
): Promise<string[]> {
  const merged = mergeEntries(rawEntries);
  if (merged.length === 0) {
    return [];
  }

  const existing = (await readListItems(listId, user)).filter(
    (item) => !isOptimisticListItem(item),
  );
  const writes = planImportWrites(merged, existing);

  for (const write of writes) {
    if (write.type === 'update') {
      if (!usesCloudListData(user, listId)) {
        await updateLocalItem(listId, write.id, { quantity: write.quantity });
      } else {
        await updateDoc(doc(db, 'lists', listId, 'items', write.id), {
          quantity: write.quantity,
          updatedAt: serverTimestamp(),
        });
      }
      continue;
    }

    await addItemToList(
      listId,
      user,
      write.name,
      { quantity: write.quantity },
      existing,
      write.order,
    );
  }

  if (usesCloudListData(user, listId)) {
    await updateDoc(doc(db, 'lists', listId), { updatedAt: serverTimestamp() });
  }

  return merged.map((entry) => normalizeItemName(entry.name));
}
