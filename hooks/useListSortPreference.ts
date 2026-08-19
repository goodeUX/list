import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  DEFAULT_SORT_MODE,
  isCustomOrder,
  isListSortMode,
  type ListSortMode,
} from '@/lib/listSort';

const SORT_MODE_KEY = 'lists.sortMode';
const CUSTOM_ORDER_KEY = 'lists.customOrder';

function parseCustomOrder(raw: string | null): string[] | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isCustomOrder(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * How the home screen orders lists, and the user's hand-picked arrangement.
 *
 * Deliberately per-user rather than per-list: members of a shared list each
 * get their own ordering. Mirrors the ThemeContext pattern — AsyncStorage is
 * the local source of truth, and `users/{uid}` carries it between devices.
 */
export function useListSortPreference() {
  const { user } = useAuth();
  const [sortMode, setSortModeState] = useState<ListSortMode>(DEFAULT_SORT_MODE);
  const [customOrder, setCustomOrderState] = useState<string[]>([]);
  // A local change beats a slower remote hydrate that was already in flight.
  const localChangeRef = useRef(false);

  useEffect(() => {
    void AsyncStorage.multiGet([SORT_MODE_KEY, CUSTOM_ORDER_KEY]).then((entries) => {
      if (localChangeRef.current) {
        return;
      }

      const stored = Object.fromEntries(entries);
      const mode = stored[SORT_MODE_KEY];
      const order = parseCustomOrder(stored[CUSTOM_ORDER_KEY]);

      if (isListSortMode(mode)) {
        setSortModeState(mode);
      }
      if (order) {
        setCustomOrderState(order);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    void getDoc(doc(db, 'users', user.uid))
      .then((snapshot) => {
        if (localChangeRef.current) {
          return;
        }

        const data = snapshot.data();
        const mode = data?.listSortMode;
        const order = data?.listCustomOrder;

        if (isListSortMode(mode)) {
          setSortModeState(mode);
          void AsyncStorage.setItem(SORT_MODE_KEY, mode);
        }
        if (isCustomOrder(order)) {
          setCustomOrderState(order);
          void AsyncStorage.setItem(CUSTOM_ORDER_KEY, JSON.stringify(order));
        }
      })
      .catch(() => {
        // Ignore missing user profile or offline read failures.
      });
  }, [user]);

  const persist = useCallback(
    (mode: ListSortMode, order: string[] | null) => {
      localChangeRef.current = true;

      const localWrites: [string, string][] = [[SORT_MODE_KEY, mode]];
      const remoteFields: Record<string, unknown> = { listSortMode: mode };

      if (order) {
        localWrites.push([CUSTOM_ORDER_KEY, JSON.stringify(order)]);
        remoteFields.listCustomOrder = order;
      }

      void AsyncStorage.multiSet(localWrites);

      if (user) {
        void updateDoc(doc(db, 'users', user.uid), remoteFields).catch(() => {
          // Ignore profile sync failures; the local preference is already saved.
        });
      }
    },
    [user],
  );

  const setSortMode = useCallback(
    (mode: ListSortMode) => {
      setSortModeState(mode);
      persist(mode, null);
    },
    [persist],
  );

  /** A drag both saves the arrangement and switches the mode to custom. */
  const applyCustomOrder = useCallback(
    (order: string[]) => {
      setCustomOrderState(order);
      setSortModeState('custom');
      persist('custom', order);
    },
    [persist],
  );

  return { sortMode, customOrder, setSortMode, applyCustomOrder };
}
