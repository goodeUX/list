import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  addLocalItem,
  deleteLocalItem,
  getLocalItems,
  subscribeLocalData,
  toggleLocalItem,
  updateLocalItem,
} from '@/lib/localStore';
import type { ListItem, NewItemFields } from '@/lib/types';

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

export async function addItemToList(
  listId: string,
  user: User | null,
  name: string,
  fields: NewItemFields = {},
  existingItems: ListItem[] = [],
): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return;
  }

  if (!user) {
    await addLocalItem(listId, trimmedName, fields);
    return;
  }

  let maxOrder = existingItems.reduce((max, item) => Math.max(max, item.order), -1);
  if (existingItems.length === 0) {
    const snapshot = await getDocs(
      query(collection(db, 'lists', listId, 'items'), orderBy('order')),
    );
    maxOrder = snapshot.docs.reduce(
      (max, docSnap) => Math.max(max, (docSnap.data().order as number) ?? 0),
      -1,
    );
  }

  await addDoc(collection(db, 'lists', listId, 'items'), {
    name: trimmedName,
    quantity: fields.quantity ?? null,
    description: fields.description ?? null,
    link: fields.link ?? null,
    checked: false,
    order: maxOrder + 1,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'lists', listId), {
    updatedAt: serverTimestamp(),
  });
}

export function useListItemCounts(listId: string) {
  const { user } = useAuth();
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!listId) {
      setDoneCount(0);
      setTotalCount(0);
      return;
    }

    if (!user) {
      let active = true;

      const refresh = async () => {
        const nextItems = await getLocalItems(listId);
        if (active) {
          setTotalCount(nextItems.length);
          setDoneCount(nextItems.filter((item) => item.checked).length);
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
  }, [listId, user]);

  return { doneCount, totalCount };
}

export function useListItems(listId: string | undefined) {
  const { user } = useAuth();
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listId) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (!user) {
      let active = true;
      setLoading(true);

      const refresh = async () => {
        const nextItems = await getLocalItems(listId);
        if (active) {
          setItems(nextItems);
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
    async (name: string, fields: NewItemFields = {}) => {
      if (!listId) {
        throw new Error('A valid list is required');
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }

      if (!user) {
        await addLocalItem(listId, trimmedName, fields);
        return;
      }

      await addItemToList(listId, user, trimmedName, fields, items);
    },
    [items, listId, user],
  );

  const toggleItem = useCallback(
    async (id: string) => {
      if (!listId) {
        return;
      }

      if (!user) {
        await toggleLocalItem(listId, id);
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
    [items, listId, user],
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

      if (!user) {
        await updateLocalItem(listId, id, updates);
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
    [listId, user],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (!listId) {
        return;
      }

      if (!user) {
        await deleteLocalItem(listId, id);
        return;
      }

      await deleteDoc(doc(db, 'lists', listId, 'items', id));
    },
    [listId, user],
  );

  return { items, loading, addItem, toggleItem, updateItem, deleteItem };
}
