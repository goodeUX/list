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
import { deleteListById } from '@/lib/listMutations';
import {
  createLocalList,
  getLocalLists,
  subscribeLocalData,
} from '@/lib/localStore';
import type { AppList } from '@/lib/types';

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return new Date();
}

function docToAppList(id: string, data: Record<string, unknown>): AppList {
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

async function loadLocalLists(): Promise<AppList[]> {
  return getLocalLists();
}

export function useLists() {
  const { user, loading: authLoading } = useAuth();
  const [lists, setLists] = useState<AppList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      let active = true;
      setLoading(true);

      const refresh = async () => {
        const nextLists = await loadLocalLists();
        if (active) {
          setLists(nextLists);
          setLoading(false);
        }
      };

      void refresh();
      const unsubscribe = subscribeLocalData(() => {
        void refresh();
      });

      return () => {
        active = false;
        unsubscribe();
      };
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
          docToAppList(docSnap.id, docSnap.data()),
        );
        nextLists.sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        );
        setLists(nextLists);

        const hasCachedData =
          snapshot.metadata.fromCache && snapshot.docs.length > 0;
        const hasServerData = !snapshot.metadata.fromCache;

        if (hasServerData || hasCachedData) {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [authLoading, user]);

  const createList = useCallback(
    async (name: string, emoji: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('List name is required');
      }

      if (!user) {
        await createLocalList(trimmedName, emoji);
        return;
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

  const deleteList = useCallback(
    async (targetListId: string) => {
      await deleteListById(targetListId, user);
    },
    [user],
  );

  return { lists, loading: authLoading || loading, createList, deleteList };
}
