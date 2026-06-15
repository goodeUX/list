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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { User } from 'firebase/auth';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { handleFirestoreListenerError } from '@/lib/firestoreListenerErrors';
import { normalizeItemName } from '@/lib/itemName';
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

const OPTIMISTIC_ITEM_ID_PREFIX = 'optimistic:';

export function isOptimisticListItem(item: ListItem): boolean {
  return item.id.startsWith(OPTIMISTIC_ITEM_ID_PREFIX);
}

function getPersistedItems(items: ListItem[]): ListItem[] {
  return items.filter((item) => !isOptimisticListItem(item));
}

function createOptimisticItem(
  name: string,
  fields: NewItemFields,
  existingItems: ListItem[],
  createdBy: string,
): ListItem {
  const now = new Date();
  const persistedItems = getPersistedItems(existingItems);
  const maxOrder = persistedItems.reduce((max, item) => Math.max(max, item.order), -1);

  return {
    id: `${OPTIMISTIC_ITEM_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    quantity: fields.quantity ?? null,
    description: fields.description ?? null,
    link: fields.link ?? null,
    checked: false,
    order: maxOrder + 1,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

function reconcileOptimisticItems(
  serverItems: ListItem[],
  optimisticItems: ListItem[],
): ListItem[] {
  const pendingOptimistic = optimisticItems.filter(
    (optimistic) =>
      !serverItems.some(
        (serverItem) =>
          serverItem.name === optimistic.name && serverItem.order === optimistic.order,
      ),
  );

  return [...serverItems, ...pendingOptimistic].sort((a, b) => a.order - b.order);
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

function countItems(items: ListItem[]) {
  return {
    doneCount: items.filter((item) => item.checked).length,
    totalCount: items.length,
  };
}

function getInitialCounts(listId: string, user: User | null) {
  if (!listId) {
    return { doneCount: 0, totalCount: 0 };
  }

  if (!user) {
    const items = getCachedLocalItems(listId);
    return countItems(items);
  }

  return { doneCount: 0, totalCount: 0 };
}

export function useListItemCounts(listId: string, refreshKey = 0) {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [doneCount, setDoneCount] = useState(
    () => getInitialCounts(listId, user).doneCount,
  );
  const [totalCount, setTotalCount] = useState(
    () => getInitialCounts(listId, user).totalCount,
  );

  const applyCounts = useCallback((items: ListItem[]) => {
    const next = countItems(items);
    setDoneCount(next.doneCount);
    setTotalCount(next.totalCount);
  }, []);

  const refreshCounts = useCallback(async () => {
    if (!listId) {
      applyCounts([]);
      return;
    }

    if (!user) {
      applyCounts(await getLocalItems(listId));
      return;
    }

    const itemsQuery = query(
      collection(db, 'lists', listId, 'items'),
      orderBy('order'),
    );

    try {
      const cachedSnapshot = await getDocsFromCache(itemsQuery);
      applyCounts(
        cachedSnapshot.docs.map((docSnap) =>
          docToListItem(docSnap.id, docSnap.data()),
        ),
      );
    } catch {
      // Listener below will keep counts in sync.
    }
  }, [applyCounts, listId, user]);

  useEffect(() => {
    if (!listId) {
      applyCounts([]);
      return;
    }

    if (!user) {
      let active = true;

      const refresh = async () => {
        const nextItems = await getLocalItems(listId);
        if (active) {
          applyCounts(nextItems);
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

    void getDocsFromCache(itemsQuery)
      .then((snapshot) => {
        applyCounts(
          snapshot.docs.map((docSnap) =>
            docToListItem(docSnap.id, docSnap.data()),
          ),
        );
      })
      .catch(() => {
        // Cache miss — onSnapshot will populate counts.
      });

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        applyCounts(
          snapshot.docs.map((docSnap) =>
            docToListItem(docSnap.id, docSnap.data()),
          ),
        );
      },
      handleFirestoreListenerError,
    );

    return unsubscribe;
  }, [applyCounts, listId, user]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    void refreshCounts();
  }, [isFocused, refreshCounts, refreshKey]);

  return { doneCount, totalCount };
}

export function useListItems(
  listId: string | undefined,
  options: { moveDoneToBottom?: boolean } = {},
) {
  const { moveDoneToBottom = false } = options;
  const { user } = useAuth();
  const optimisticItemsRef = useRef<ListItem[]>([]);
  const cachedItems = listId && !user ? getCachedLocalItems(listId) : [];
  const [items, setItems] = useState<ListItem[]>(cachedItems);
  const [loading, setLoading] = useState(cachedItems.length === 0);

  const applyServerItems = useCallback((serverItems: ListItem[]) => {
    optimisticItemsRef.current = optimisticItemsRef.current.filter(
      (optimistic) =>
        !serverItems.some(
          (serverItem) =>
            serverItem.name === optimistic.name && serverItem.order === optimistic.order,
        ),
    );
    setItems(reconcileOptimisticItems(serverItems, optimisticItemsRef.current));
  }, []);

  useEffect(() => {
    optimisticItemsRef.current = [];
  }, [listId]);

  useEffect(() => {
    if (!listId) {
      optimisticItemsRef.current = [];
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
          applyServerItems(nextItems);
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
        applyServerItems(nextItems);
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
        applyServerItems(nextItems);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreListenerError(error);
      },
    );

    return unsubscribe;
  }, [applyServerItems, listId, user]);

  const addItem = useCallback(
    async (name: string, fields: NewItemFields = {}) => {
      if (!listId) {
        throw new Error('A valid list is required');
      }

      const trimmedName = normalizeItemName(name);
      if (!trimmedName) {
        return;
      }

      const persistedItems = getPersistedItems(items);
      const optimisticItem = createOptimisticItem(
        trimmedName,
        fields,
        persistedItems,
        user?.uid ?? 'local',
      );
      optimisticItemsRef.current = [...optimisticItemsRef.current, optimisticItem];
      setItems((current) =>
        [...current, optimisticItem].sort((a, b) => a.order - b.order),
      );

      try {
        if (!user) {
          await addLocalItem(listId, trimmedName, fields);
          return;
        }

        await addItemToList(listId, user, trimmedName, fields, persistedItems);
      } catch (error) {
        optimisticItemsRef.current = optimisticItemsRef.current.filter(
          (item) => item.id !== optimisticItem.id,
        );
        setItems((current) => current.filter((item) => item.id !== optimisticItem.id));
        throw error;
      }
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
        return;
      }

      await deleteDoc(doc(db, 'lists', listId, 'items', id));
    },
    [listId, user],
  );

  const clearAllItems = useCallback(
    async () => {
      if (!listId) {
        return;
      }

      await clearListItemsById(listId, user);
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
