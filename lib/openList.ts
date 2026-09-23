import { router } from 'expo-router';

// Long enough to swallow a double tap (or a second open while the first is
// still landing); short enough that moving between lists isn't slowed.
const REPEAT_OPEN_WINDOW_MS = 800;

let lastOpenedAt = 0;

type ListParams = {
  id: string;
  emoji?: string;
  focusAdd?: string;
  name?: string;
};

/**
 * Opens a list page — the only way the app should. A second open within
 * REPEAT_OPEN_WINDOW_MS is ignored: two pushes that close together race, and
 * the loser's page is left on screen with no route behind it, so back reveals
 * a stale copy of the list instead of My Lists.
 *
 * `replace` swaps the current screen for the list (e.g. from import or join).
 */
export function openList(params: ListParams, { replace = false }: { replace?: boolean } = {}) {
  const now = Date.now();
  if (now - lastOpenedAt < REPEAT_OPEN_WINDOW_MS) {
    return;
  }
  lastOpenedAt = now;

  const href = { pathname: '/list/[id]' as const, params };
  if (replace) {
    router.replace(href);
  } else {
    router.push(href);
  }
}
