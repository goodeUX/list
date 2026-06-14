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
import { normalizeListName } from '@/lib/listName';
import {
  clearLocalListItems,
  deleteLocalList,
  updateLocalList,
} from '@/lib/localStore';

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

export async function updateListDetails(
  listId: string,
  user: User | null,
  updates: { name: string; emoji: string },
): Promise<void> {
  if (!listId) {
    return;
  }

  const trimmedName = normalizeListName(updates.name);
  if (!trimmedName) {
    throw new Error('List name is required');
  }

  const emoji = updates.emoji || '📋';

  if (!user) {
    await updateLocalList(listId, { name: trimmedName, emoji });
    return;
  }

  await updateDoc(doc(db, 'lists', listId), {
    name: trimmedName,
    emoji,
    updatedAt: serverTimestamp(),
  });
}

export async function setListMoveDoneToBottom(
  listId: string,
  user: User | null,
  moveDoneToBottom: boolean,
): Promise<void> {
  if (!listId) {
    return;
  }

  if (!user) {
    await updateLocalList(listId, { moveDoneToBottom });
    return;
  }

  await updateDoc(doc(db, 'lists', listId), {
    moveDoneToBottom,
    updatedAt: serverTimestamp(),
  });
}
