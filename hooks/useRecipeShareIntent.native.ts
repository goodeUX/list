import { router } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { useEffect } from 'react';

import { extractSharedUrl } from '@/lib/recipeImport';

/**
 * Subscribes to the Android share sheet. When another app shares plain text or
 * a URL into List Kitty, we pull the first URL out of it and route to the
 * import screen. `expo-share-intent` loads its native module via
 * `requireOptionalNativeModule`, so this degrades to "no share intent" in Expo
 * Go (module absent) instead of crashing — matching the defensive pattern used
 * for Google sign-in and RevenueCat. Only real shares arrive in a dev build.
 */
export function useRecipeShareIntent(): void {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    resetOnBackground: true,
  });

  useEffect(() => {
    if (!hasShareIntent) {
      return;
    }

    const shared = shareIntent.webUrl ?? shareIntent.text ?? '';
    const url = extractSharedUrl(shared);
    // Clear the native intent before navigating so re-opening the app later
    // doesn't replay the same share.
    resetShareIntent();

    if (url) {
      router.push({ pathname: '/import', params: { url } });
    }
  }, [hasShareIntent, shareIntent, resetShareIntent]);
}
