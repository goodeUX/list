import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { clearLocalListItems, deleteLocalList } from '@/lib/localStore';

export async function deleteListById(
  listId: string,
  user: User | null,
): Promise<void> {
  if (!listId) {
    return;
  }

  if (!user) {
    await deleteLocalList(listId);
    return;
  }

  const itemsSnapshot = await getDocs(
    collection(db, 'lists', listId, 'items'),
  );
  await Promise.all(
    itemsSnapshot.docs.map((itemDoc) => deleteDoc(itemDoc.ref)),
  );
  await deleteDoc(doc(db, 'lists', listId));
}

export async function clearListItemsById(
  listId: string,
  user: User | null,
): Promise<void> {
  if (!listId) {
    return;
  }

  if (!user) {
    await clearLocalListItems(listId);
    return;
  }

  const itemsSnapshot = await getDocs(
    collection(db, 'lists', listId, 'items'),
  );
  await Promise.all(
    itemsSnapshot.docs.map((itemDoc) => deleteDoc(itemDoc.ref)),
  );
  await updateDoc(doc(db, 'lists', listId), {
    updatedAt: serverTimestamp(),
  });
}
