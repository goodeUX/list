import { router } from 'expo-router';

/**
 * Returns to My Lists: back down the stack to the existing home screen if
 * there is one (dropping everything above it), otherwise opening it in place
 * of the current screen. `router.replace('/')` would instead put a second My
 * Lists on top of the first, so back would step through both.
 */
export function goHome() {
  router.dismissTo('/');
}
