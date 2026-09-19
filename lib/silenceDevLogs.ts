/**
 * Drops a few known-benign warnings/errors that dependencies emit on launch so
 * they don't clutter the Metro/dev console. Development only — the production
 * console is left untouched.
 *
 * - "InteractionManager has been deprecated": react-native-draggable-flatlist
 *   and expo-router's vendored navigation stack still call the API deprecated
 *   in React Native 0.86. Our own code no longer uses it.
 * - "Can't perform a React state update on a component that hasn't mounted yet":
 *   emitted by expo-router's own ExpoRoot/useLinking during initial URL
 *   resolution (expo-router/build/fork/useLinking.native.js).
 */
const IGNORED_PATTERNS = [
  'InteractionManager has been deprecated',
  "Can't perform a React state update on a component that hasn't mounted yet",
];

function isIgnored(args: unknown[]): boolean {
  const first = args[0];
  return (
    typeof first === 'string' &&
    IGNORED_PATTERNS.some((pattern) => first.includes(pattern))
  );
}

if (__DEV__) {
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    if (isIgnored(args)) {
      return;
    }
    originalWarn(...args);
  };

  console.error = (...args: unknown[]) => {
    if (isIgnored(args)) {
      return;
    }
    originalError(...args);
  };
}
