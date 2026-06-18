import { arrayUnion, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export async function joinList(listId: string, userId: string): Promise<void> {
  const listRef = doc(db, 'lists', listId);
  const snapshot = await getDoc(listRef);

  if (!snapshot.exists()) {
    throw new Error('List not found');
  }

  const memberIds = (snapshot.data().memberIds as string[]) ?? [];
  if (memberIds.includes(userId)) {
    return;
  }

  await updateDoc(listRef, {
    memberIds: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}
