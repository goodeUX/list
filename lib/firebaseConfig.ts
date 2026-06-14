// Metro only inlines `process.env.EXPO_PUBLIC_*` for static property access.
// Dynamic access like `process.env[key]` stays empty in production builds.
const firebaseEnv = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
} as const;

const firebaseEnvKeyByField = {
  apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  messagingSenderId: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'EXPO_PUBLIC_FIREBASE_APP_ID',
} as const;

export function getMissingFirebaseEnvKeys(): string[] {
  return (Object.keys(firebaseEnvKeyByField) as Array<keyof typeof firebaseEnvKeyByField>)
    .filter((field) => !firebaseEnv[field]?.trim())
    .map((field) => firebaseEnvKeyByField[field]);
}

export function isFirebaseConfigured(): boolean {
  return getMissingFirebaseEnvKeys().length === 0;
}

export function assertFirebaseConfigured(): void {
  const missing = getMissingFirebaseEnvKeys();
  if (missing.length === 0) {
    return;
  }

  throw new Error(
    `Firebase is not configured. Missing environment variables: ${missing.join(', ')}. ` +
      'Copy `.env.example` to `.env`, add values from Firebase Console, and restart Expo.',
  );
}

export function getFirebaseConfig() {
  assertFirebaseConfigured();

  return {
    apiKey: firebaseEnv.apiKey!,
    authDomain: firebaseEnv.authDomain!,
    projectId: firebaseEnv.projectId!,
    messagingSenderId: firebaseEnv.messagingSenderId!,
    appId: firebaseEnv.appId!,
  };
}
