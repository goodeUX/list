import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateEmail,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { auth, db } from '@/lib/firebase';
import { migrateLocalDataToCloud } from '@/lib/migrateLocalToCloud';
import type { ThemePreference } from '@/lib/theme';

const THEME_PREFERENCE_KEY = 'themePreference';

function parseThemePreference(value: string | null): ThemePreference | null {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  return null;
}

async function getLocalThemePreference(): Promise<ThemePreference> {
  const stored = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
  return parseThemePreference(stored) ?? 'system';
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateAccount: (input: {
    displayName: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function getAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string }).code;

  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/requires-recent-login':
      return 'Please sign in again and try updating your account.';
    case 'auth/missing-display-name':
      return 'Please enter your name.';
    case 'auth/missing-current-password':
      return 'Enter your current password to change email or password.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(
      doc(db, 'users', credential.user.uid),
      {
        uid: credential.user.uid,
        displayName: credential.user.displayName ?? '',
        email: credential.user.email ?? email.trim(),
      },
      { merge: true },
    );

    try {
      await migrateLocalDataToCloud(credential.user.uid);
    } catch (error) {
      console.error('Failed to migrate local data after sign in', error);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const trimmedEmail = email.trim();
      const trimmedName = displayName.trim();
      const credential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password,
      );

      await updateProfile(credential.user, { displayName: trimmedName });
      const themePreference = await getLocalThemePreference();
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        displayName: trimmedName,
        email: trimmedEmail,
        themePreference,
      });
      await migrateLocalDataToCloud(credential.user.uid);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const updateAccount = useCallback(
    async ({
      displayName,
      email,
      currentPassword,
      newPassword,
    }: {
      displayName: string;
      email: string;
      currentPassword?: string;
      newPassword?: string;
    }) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw { code: 'auth/user-not-found' };
      }

      const trimmedName = displayName.trim();
      const trimmedEmail = email.trim();
      const trimmedPassword = newPassword?.trim() ?? '';
      const emailChanging = trimmedEmail !== (currentUser.email ?? '');
      const passwordChanging = trimmedPassword.length > 0;
      const nameChanging = trimmedName !== (currentUser.displayName ?? '');
      const sensitiveChange = emailChanging || passwordChanging;

      if (!trimmedName) {
        throw { code: 'auth/missing-display-name' };
      }

      if (sensitiveChange && !currentPassword) {
        throw { code: 'auth/missing-current-password' };
      }

      if (nameChanging) {
        await updateProfile(currentUser, { displayName: trimmedName });
      }

      if (sensitiveChange) {
        const loginEmail = currentUser.email;
        if (!loginEmail) {
          throw { code: 'auth/invalid-email' };
        }

        const credential = EmailAuthProvider.credential(loginEmail, currentPassword!);
        await reauthenticateWithCredential(currentUser, credential);
      }

      if (emailChanging) {
        await updateEmail(currentUser, trimmedEmail);
      }

      if (passwordChanging) {
        await updatePassword(currentUser, trimmedPassword);
      }

      if (nameChanging || emailChanging) {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            ...(nameChanging ? { displayName: trimmedName } : {}),
            ...(emailChanging ? { email: trimmedEmail } : {}),
          },
          { merge: true },
        );
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, updateAccount }),
    [user, loading, signIn, signUp, signOut, updateAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
