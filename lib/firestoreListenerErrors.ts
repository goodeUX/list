import type { FirestoreError } from 'firebase/firestore';

export function handleFirestoreListenerError(error: FirestoreError): void {
  if (error.code === 'permission-denied' || error.code === 'not-found') {
    return;
  }

  console.error(error);
}
