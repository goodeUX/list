import type { FirestoreError } from 'firebase/firestore';

export function isFirestorePermissionError(error: unknown): boolean {
  return (error as FirestoreError).code === 'permission-denied';
}

export function handleFirestoreListenerError(error: FirestoreError): void {
  if (error.code === 'permission-denied' || error.code === 'not-found') {
    return;
  }

  console.error(error);
}
