import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { copyListItemHistoryToCloud } from '@/lib/listItemHistory';
import {
  deleteLocalListHistory,
  getLocalListHistory,
} from '@/lib/localListHistory';
import { clearLocalDatabase, getLocalDatabaseSnapshot } from '@/lib/localStore';

export async function migrateLocalDataToCloud(userId: string): Promise<number> {
  const snapshot = await getLocalDatabaseSnapshot();

  if (snapshot.lists.length === 0) {
    return 0;
  }

  for (const list of snapshot.lists) {
    const listRef = await addDoc(collection(db, 'lists'), {
      name: list.name,
      emoji: list.emoji,
      ownerId: userId,
      memberIds: [userId],
      moveDoneToBottom: list.moveDoneToBottom ?? false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Carried over so the suggestions the list had built up survive sign-in.
    await copyListItemHistoryToCloud(listRef.id, await getLocalListHistory(list.id));
    await deleteLocalListHistory(list.id);

    const items = snapshot.itemsByListId[list.id] ?? [];
    if (items.length === 0) {
      continue;
    }

    const batch = writeBatch(db);
    items.forEach((item) => {
      const itemRef = doc(collection(db, 'lists', listRef.id, 'items'));
      batch.set(itemRef, {
        name: item.name,
        quantity: item.quantity,
        description: item.description,
        link: item.link,
        checked: item.checked,
        order: item.order,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  await clearLocalDatabase();
  return snapshot.lists.length;
}
