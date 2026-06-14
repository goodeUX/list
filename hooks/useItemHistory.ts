import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { handleFirestoreListenerError } from '@/lib/firestoreListenerErrors';
import { historyDocId } from '@/lib/historyDocId';
import {
  getLocalItemHistory,
  recordLocalItemUsage,
  subscribeLocalHistory,
} from '@/lib/localHistory';
import type { ItemHistoryEntry } from '@/lib/types';

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return new Date();
}

function docToHistoryEntry(id: string, data: Record<string, unknown>): ItemHistoryEntry {
  return {
    id,
    name: (data.name as string) ?? '',
    quantity: (data.quantity as string | null) ?? null,
    lastUsedAt: toDate(data.lastUsedAt),
    useCount: (data.useCount as number) ?? 1,
    lastListId: (data.lastListId as string) ?? '',
  };
}

export function useItemHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ItemHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      let active = true;
      setLoading(true);

      const refresh = async () => {
        const nextEntries = await getLocalItemHistory();
        if (active) {
          setEntries(nextEntries);
          setLoading(false);
        }
      };

      void refresh();
      const unsubscribe = subscribeLocalHistory(() => {
        void refresh();
      });

      return () => {
        active = false;
        unsubscribe();
      };
    }

    setLoading(true);

    const historyQuery = query(
      collection(db, 'users', user.uid, 'itemHistory'),
      orderBy('lastUsedAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const nextEntries = snapshot.docs.map((docSnap) =>
          docToHistoryEntry(docSnap.id, docSnap.data()),
        );
        setEntries(nextEntries);
        setLoading(false);
      },
      (error) => {
        handleFirestoreListenerError(error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  const recordItemUsage = useCallback(
    async (name: string, quantity: string | null, listId: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }

      if (!user) {
        await recordLocalItemUsage(trimmedName, quantity, listId);
        return;
      }

      const entryId = historyDocId(trimmedName);
      const entryRef = doc(db, 'users', user.uid, 'itemHistory', entryId);
      const existing = entries.find((entry) => entry.id === entryId);

      await setDoc(entryRef, {
        name: trimmedName,
        quantity: quantity ?? existing?.quantity ?? null,
        lastUsedAt: serverTimestamp(),
        useCount: (existing?.useCount ?? 0) + 1,
        lastListId: listId,
      });
    },
    [entries, user],
  );

  return { entries, loading, recordItemUsage };
}
