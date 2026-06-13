import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { historyDocId } from '@/lib/historyDocId';
import { clearLocalHistory, getLocalHistorySnapshot } from '@/lib/localHistory';
import { clearLocalDatabase, getLocalDatabaseSnapshot } from '@/lib/localStore';

export async function migrateLocalDataToCloud(userId: string): Promise<number> {
  const snapshot = await getLocalDatabaseSnapshot();
  const history = await getLocalHistorySnapshot();

  if (snapshot.lists.length === 0 && history.length === 0) {
    return 0;
  }

  for (const entry of history) {
    await setDoc(doc(db, 'users', userId, 'itemHistory', historyDocId(entry.name)), {
      name: entry.name,
      quantity: entry.quantity,
      lastUsedAt: serverTimestamp(),
      useCount: entry.useCount,
      lastListId: entry.lastListId,
    });
  }

  for (const list of snapshot.lists) {
    const listRef = await addDoc(collection(db, 'lists'), {
      name: list.name,
      emoji: list.emoji,
      ownerId: userId,
      memberIds: [userId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

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
  await clearLocalHistory();
  return snapshot.lists.length;
}
