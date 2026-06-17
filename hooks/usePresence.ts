import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { handleFirestoreListenerError, isFirestorePermissionError } from '@/lib/firestoreListenerErrors';
import { isLocalListId } from '@/lib/listIds';

const PRESENCE_INTERVAL_MS = 15_000;
const ACTIVE_THRESHOLD_MS = 30_000;

type PresenceUser = {
  uid: string;
  displayName: string;
};

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return new Date();
}

export function usePresence(listId: string | undefined) {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

  const writePresence = useCallback(async () => {
    if (!user || !listId || isLocalListId(listId)) {
      return;
    }

    try {
      await setDoc(
        doc(db, 'lists', listId, 'presence', user.uid),
        {
          displayName: user.displayName || user.email || 'Someone',
          lastActive: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      if (!isFirestorePermissionError(error)) {
        console.error(error);
      }
    }
  }, [listId, user]);

  useEffect(() => {
    if (!user || !listId || isLocalListId(listId)) {
      setActiveUsers([]);
      return;
    }

    void writePresence();

    const interval = setInterval(() => {
      void writePresence();
    }, PRESENCE_INTERVAL_MS);

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void writePresence();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    const presenceQuery = collection(db, 'lists', listId, 'presence');
    const unsubscribe = onSnapshot(
      presenceQuery,
      (snapshot) => {
        const now = Date.now();
        const users = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              uid: docSnap.id,
              displayName: (data.displayName as string) || 'Someone',
              lastActive: toDate(data.lastActive),
            };
          })
          .filter(
            (entry) =>
              entry.uid !== user.uid &&
              now - entry.lastActive.getTime() < ACTIVE_THRESHOLD_MS,
          )
          .map(({ uid, displayName }) => ({ uid, displayName }));

        setActiveUsers(users);
      },
      handleFirestoreListenerError,
    );

    return () => {
      clearInterval(interval);
      subscription.remove();
      unsubscribe();
    };
  }, [listId, user, writePresence]);

  return { activeUsers };
}
