import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import type { ListItem } from '@/lib/types';

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return new Date();
}

function docToListItem(id: string, data: Record<string, unknown>): ListItem {
  return {
    id,
    name: (data.name as string) ?? '',
    quantity: (data.quantity as string | null) ?? null,
    description: (data.description as string | null) ?? null,
    link: (data.link as string | null) ?? null,
    checked: (data.checked as boolean) ?? false,
    order: (data.order as number) ?? 0,
    createdBy: (data.createdBy as string) ?? '',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function useListItemCounts(listId: string) {
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!listId) {
      setDoneCount(0);
      setTotalCount(0);
      return;
    }

    const itemsQuery = query(
      collection(db, 'lists', listId, 'items'),
      orderBy('order'),
    );

    const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
      const nextItems = snapshot.docs.map((docSnap) =>
        docToListItem(docSnap.id, docSnap.data()),
      );
      setTotalCount(nextItems.length);
      setDoneCount(nextItems.filter((item) => item.checked).length);
    });

    return unsubscribe;
  }, [listId]);

  return { doneCount, totalCount };
}

export function useListItems(listId: string | undefined) {
  const { user } = useAuth();
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listId || !user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const itemsQuery = query(
      collection(db, 'lists', listId, 'items'),
      orderBy('order'),
    );

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const nextItems = snapshot.docs.map((docSnap) =>
          docToListItem(docSnap.id, docSnap.data()),
        );
        setItems(nextItems);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [listId, user]);

  const addItem = useCallback(
    async (name: string) => {
      if (!user || !listId) {
        throw new Error('Must be signed in with a valid list');
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }

      const maxOrder = items.reduce((max, item) => Math.max(max, item.order), -1);

      await addDoc(collection(db, 'lists', listId, 'items'), {
        name: trimmedName,
        quantity: null,
        description: null,
        link: null,
        checked: false,
        order: maxOrder + 1,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'lists', listId), {
        updatedAt: serverTimestamp(),
      });
    },
    [items, listId, user],
  );

  const toggleItem = useCallback(
    async (id: string) => {
      if (!listId) {
        return;
      }

      const item = items.find((entry) => entry.id === id);
      if (!item) {
        return;
      }

      await updateDoc(doc(db, 'lists', listId, 'items', id), {
        checked: !item.checked,
        updatedAt: serverTimestamp(),
      });
    },
    [items, listId],
  );

  const updateItem = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<ListItem, 'name' | 'quantity' | 'description' | 'link' | 'checked' | 'order'>
      >,
    ) => {
      if (!listId) {
        return;
      }

      const payload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (updates.name !== undefined) {
        payload.name = updates.name;
      }
      if (updates.quantity !== undefined) {
        payload.quantity = updates.quantity;
      }
      if (updates.description !== undefined) {
        payload.description = updates.description;
      }
      if (updates.link !== undefined) {
        payload.link = updates.link;
      }
      if (updates.checked !== undefined) {
        payload.checked = updates.checked;
      }
      if (updates.order !== undefined) {
        payload.order = updates.order;
      }

      await updateDoc(doc(db, 'lists', listId, 'items', id), payload);
    },
    [listId],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (!listId) {
        return;
      }

      await deleteDoc(doc(db, 'lists', listId, 'items', id));
    },
    [listId],
  );

  return { items, loading, addItem, toggleItem, updateItem, deleteItem };
}
