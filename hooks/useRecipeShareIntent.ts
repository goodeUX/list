// Web / non-native fallback. The share-sheet integration relies on the
// `expo-share-intent` native module, which only exists in a native dev build
// (never on web or in Expo Go). Keeping a no-op here means `app/_layout.tsx`
// can call the hook unconditionally without pulling the native package into
// the web bundle. See `useRecipeShareIntent.native.ts` for the real behavior.
export function useRecipeShareIntent(): void {
  // Intentionally empty.
}
