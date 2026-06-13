const FIREBASE_ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

export function getMissingFirebaseEnvKeys(): string[] {
  return FIREBASE_ENV_KEYS.filter((key) => !process.env[key]?.trim());
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
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  };
}
