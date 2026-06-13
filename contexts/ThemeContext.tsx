import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  colors,
  radii,
  spacing,
  type ColorScheme,
  type ThemeColors,
  type ThemePreference,
} from '@/lib/theme';

const THEME_PREFERENCE_KEY = 'themePreference';

type ThemeContextValue = {
  colors: ThemeColors;
  radii: typeof radii;
  spacing: typeof spacing;
  colorScheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    void getDoc(doc(db, 'users', user.uid)).then((snapshot) => {
      const stored = snapshot.data()?.themePreference;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
        void AsyncStorage.setItem(THEME_PREFERENCE_KEY, stored);
      }
    });
  }, [user]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      void AsyncStorage.setItem(THEME_PREFERENCE_KEY, next);
      if (user) {
        void updateDoc(doc(db, 'users', user.uid), { themePreference: next });
      }
    },
    [user],
  );

  const colorScheme: ColorScheme =
    preference === 'system' ? (systemColorScheme ?? 'light') : preference;

  const value = useMemo(
    () => ({
      colors: colors[colorScheme],
      radii,
      spacing,
      colorScheme,
      preference,
      setPreference,
    }),
    [colorScheme, preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
