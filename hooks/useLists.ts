import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import type { SageList } from '@/lib/types';

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return new Date();
}

function docToSageList(id: string, data: Record<string, unknown>): SageList {
  return {
    id,
    name: (data.name as string) ?? '',
    emoji: (data.emoji as string) ?? '📋',
    ownerId: (data.ownerId as string) ?? '',
    memberIds: (data.memberIds as string[]) ?? [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function useLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState<SageList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLists([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const listsQuery = query(
      collection(db, 'lists'),
      where('memberIds', 'array-contains', user.uid),
    );

    const unsubscribe = onSnapshot(
      listsQuery,
      (snapshot) => {
        const nextLists = snapshot.docs.map((docSnap) =>
          docToSageList(docSnap.id, docSnap.data()),
        );
        nextLists.sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        );
        setLists(nextLists);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  const createList = useCallback(
    async (name: string, emoji: string) => {
      if (!user) {
        throw new Error('Must be signed in to create a list');
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('List name is required');
      }

      await addDoc(collection(db, 'lists'), {
        name: trimmedName,
        emoji: emoji || '📋',
        ownerId: user.uid,
        memberIds: [user.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [user],
  );

  return { lists, loading, createList };
}
