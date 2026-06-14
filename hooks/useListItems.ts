import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromCache,
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
import { handleFirestoreListenerError } from '@/lib/firestoreListenerErrors';
import { normalizeItemName } from '@/lib/itemName';
import { playDeleteItemHaptic } from '@/lib/haptics';
import { clearListItemsById } from '@/lib/listMutations';
import {
  groupItemsWithDoneAtBottom,
  orderItemsAfterToggle,
  withSequentialOrder,
} from '@/lib/listItemOrdering';
import {
  addLocalItem,
  deleteLocalItem,
  getCachedLocalItems,
  getLocalItems,
  reorderLocalItems,
  subscribeLocalData,
  syncLocalItems,
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
  const trimmedName = normalizeItemName(name);
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

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const nextItems = snapshot.docs.map((docSnap) =>
          docToListItem(docSnap.id, docSnap.data()),
        );
        setTotalCount(nextItems.length);
        setDoneCount(nextItems.filter((item) => item.checked).length);
      },
      handleFirestoreListenerError,
    );

    return unsubscribe;
  }, [listId, user]);

  return { doneCount, totalCount };
}

export function useListItems(
  listId: string | undefined,
  options: { moveDoneToBottom?: boolean } = {},
) {
  const { moveDoneToBottom = false } = options;
  const { user } = useAuth();
  const cachedItems = listId && !user ? getCachedLocalItems(listId) : [];
  const [items, setItems] = useState<ListItem[]>(cachedItems);
  const [loading, setLoading] = useState(cachedItems.length === 0);

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

    void getDocsFromCache(itemsQuery)
      .then((snapshot) => {
        const nextItems = snapshot.docs.map((docSnap) =>
          docToListItem(docSnap.id, docSnap.data()),
        );
        setItems(nextItems);
        setLoading(false);
      })
      .catch(() => {
        // Cache miss — onSnapshot will populate items.
      });

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const nextItems = snapshot.docs.map((docSnap) =>
          docToListItem(docSnap.id, docSnap.data()),
        );
        setItems(nextItems);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreListenerError(error);
      },
    );

    return unsubscribe;
  }, [listId, user]);

  const addItem = useCallback(
    async (name: string, fields: NewItemFields = {}) => {
      if (!listId) {
        throw new Error('A valid list is required');
      }

      const trimmedName = normalizeItemName(name);
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

  const applyItemLayout = useCallback(
    async (orderedItems: ListItem[]) => {
      if (!listId) {
        return;
      }

      const sequential = withSequentialOrder(orderedItems);

      if (!user) {
        await syncLocalItems(listId, sequential);
        return;
      }

      await Promise.all(
        sequential.map((entry) =>
          updateDoc(doc(db, 'lists', listId, 'items', entry.id), {
            checked: entry.checked,
            order: entry.order,
            updatedAt: serverTimestamp(),
          }),
        ),
      );

      await updateDoc(doc(db, 'lists', listId), {
        updatedAt: serverTimestamp(),
      });
    },
    [listId, user],
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

      if (moveDoneToBottom) {
        const nextOrdered = withSequentialOrder(orderItemsAfterToggle(items, id));
        await applyItemLayout(nextOrdered);
        return;
      }

      if (!user) {
        await toggleLocalItem(listId, id);
        return;
      }

      await updateDoc(doc(db, 'lists', listId, 'items', id), {
        checked: !item.checked,
        updatedAt: serverTimestamp(),
      });
    },
    [applyItemLayout, items, listId, moveDoneToBottom, user],
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
        payload.name = normalizeItemName(updates.name);
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
        playDeleteItemHaptic();
        return;
      }

      await deleteDoc(doc(db, 'lists', listId, 'items', id));
      playDeleteItemHaptic();
    },
    [listId, user],
  );

  const clearAllItems = useCallback(
    async () => {
      if (!listId) {
        return;
      }

      await clearListItemsById(listId, user);
      playDeleteItemHaptic();
    },
    [listId, user],
  );

  const reorderItems = useCallback(
    async (orderedItems: ListItem[]) => {
      if (!listId) {
        return;
      }

      const nextOrder = orderedItems.map((item, index) => ({
        id: item.id,
        order: index,
      }));

      const hasChanges = nextOrder.some(
        (entry) => items.find((item) => item.id === entry.id)?.order !== entry.order,
      );

      if (!hasChanges) {
        return;
      }

      if (!user) {
        await reorderLocalItems(
          listId,
          nextOrder.map((entry) => entry.id),
        );
        return;
      }

      await Promise.all(
        nextOrder
          .filter(
            (entry) =>
              items.find((item) => item.id === entry.id)?.order !== entry.order,
          )
          .map((entry) =>
            updateDoc(doc(db, 'lists', listId, 'items', entry.id), {
              order: entry.order,
              updatedAt: serverTimestamp(),
            }),
          ),
      );

      await updateDoc(doc(db, 'lists', listId), {
        updatedAt: serverTimestamp(),
      });
    },
    [items, listId, user],
  );

  const groupDoneItemsAtBottom = useCallback(async () => {
    if (!listId || items.length === 0) {
      return;
    }

    const nextOrdered = withSequentialOrder(groupItemsWithDoneAtBottom(items));
    await applyItemLayout(nextOrdered);
  }, [applyItemLayout, items, listId]);

  return {
    items,
    loading,
    addItem,
    toggleItem,
    updateItem,
    deleteItem,
    clearAllItems,
    reorderItems,
    groupDoneItemsAtBottom,
  };
}
