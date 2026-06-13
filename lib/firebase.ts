import { initializeApp } from 'firebase/app';
import { type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { createFirebaseAuth } from './firebaseAuth';
import { getFirebaseConfig } from './firebaseConfig';

export { isFirebaseConfigured } from './firebaseConfig';

const app = initializeApp(getFirebaseConfig());
export const auth: Auth = createFirebaseAuth(app);
export const db: Firestore = getFirestore(app);
