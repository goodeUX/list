import { usePathname } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { shouldSkipOpeningScreen } from '@/lib/openingScreen';

function getPathnameFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, 'https://app.local').pathname;
  } catch {
    return null;
  }
}

function getInitialWebPathname(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.location.pathname;
}

export function useShouldSkipOpening(): boolean {
  const pathname = usePathname();
  const [initialPathname, setInitialPathname] = useState<string | null>(getInitialWebPathname);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void Linking.getInitialURL().then((url) => {
      setInitialPathname(getPathnameFromUrl(url));
    });
  }, []);

  if (shouldSkipOpeningScreen(pathname)) {
    return true;
  }

  if (initialPathname && shouldSkipOpeningScreen(initialPathname)) {
    return true;
  }

  return false;
}
