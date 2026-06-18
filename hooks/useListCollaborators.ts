import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import { handleFirestoreListenerError } from '@/lib/firestoreListenerErrors';

export type Collaborator = {
  uid: string;
  displayName: string;
  email: string | null;
};

export function useListCollaborators(listId: string | undefined) {
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listId) {
      setMemberIds([]);
      setCollaborators([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'lists', listId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setMemberIds([]);
          return;
        }
        setMemberIds((snapshot.data().memberIds as string[]) ?? []);
      },
      handleFirestoreListenerError,
    );

    return unsubscribe;
  }, [listId]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadCollaborators = async () => {
      if (memberIds.length === 0) {
        if (active) {
          setCollaborators([]);
          setLoading(false);
        }
        return;
      }

      const results = await Promise.all(
        memberIds.map(async (uid) => {
          try {
            const snapshot = await getDoc(doc(db, 'users', uid));
            const data = snapshot.data();
            const email = (data?.email as string) || null;
            const displayName =
              (data?.displayName as string) || email || 'Member';

            return {
              uid,
              displayName,
              email,
            };
          } catch {
            return {
              uid,
              displayName: 'Member',
              email: null,
            };
          }
        }),
      );

      if (active) {
        setCollaborators(results);
        setLoading(false);
      }
    };

    void loadCollaborators();

    return () => {
      active = false;
    };
  }, [memberIds]);

  return {
    collaborators,
    loading,
    memberIds,
  };
}
