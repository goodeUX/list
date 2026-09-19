import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { db } from '@/lib/firebase';
import { addItemToList } from '@/hooks/useListItems';
import { normalizeItemName } from '@/lib/itemName';
import { nextItemOrder } from '@/lib/listItemOrdering';
import { usesCloudListData } from '@/lib/listIds';
import { getLocalItems, updateLocalItem } from '@/lib/localStore';
import { planItemMerges } from '@/lib/mergeItems';
import { mergeEntries } from '@/lib/parseItemEntries';
import type { ParsedEntry } from '@/lib/parseItemEntries';
import type { ListItem } from '@/lib/types';

async function readListItems(listId: string, user: User | null): Promise<ListItem[]> {
  if (!usesCloudListData(user, listId)) {
    return getLocalItems(listId);
  }
  const snapshot = await getDocs(
    query(collection(db, 'lists', listId, 'items'), orderBy('order')),
  );
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: (data.name as string) ?? '',
      quantity: (data.quantity as string | null) ?? null,
      description: (data.description as string | null) ?? null,
      link: (data.link as string | null) ?? null,
      checked: (data.checked as boolean) ?? false,
      order: (data.order as number) ?? 0,
      subItems: [],
      createdBy: (data.createdBy as string) ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
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
  const entries = mergeEntries(rawEntries);
  if (entries.length === 0) {
    return [];
  }

  const existing = (await readListItems(listId, user)).filter(
    (item) => !item.id.startsWith('optimistic:'),
  );
  const actions = planItemMerges(entries, existing);

  const base = nextItemOrder(existing);
  const addCount = actions.filter((action) => action.type === 'add').length;
  let addIndex = 0;

  for (const action of actions) {
    if (action.type === 'update') {
      if (!usesCloudListData(user, listId)) {
        await updateLocalItem(listId, action.id, { quantity: action.quantity });
      } else {
        await updateDoc(doc(db, 'lists', listId, 'items', action.id), {
          quantity: action.quantity,
          updatedAt: serverTimestamp(),
        });
      }
      continue;
    }

    const order = base - (addCount - 1 - addIndex);
    addIndex += 1;
    await addItemToList(
      listId,
      user,
      action.name,
      { quantity: action.quantity },
      existing,
      order,
    );
  }

  if (usesCloudListData(user, listId)) {
    await updateDoc(doc(db, 'lists', listId), { updatedAt: serverTimestamp() });
  }

  return entries.map((entry) => normalizeItemName(entry.name));
}
