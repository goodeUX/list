import AsyncStorage from '@react-native-async-storage/async-storage';

// Which list items have their sub-items expanded on the list page. Collapsed
// is the default, so only expanded item IDs are stored. It's a per-device
// viewing preference, kept in AsyncStorage and mirrored in memory so rows can
// read it synchronously and don't flash collapsed when the page reopens.
export const EXPANDED_SUB_ITEMS_KEY = 'listItems.expandedSubItems';

let expanded = new Set<string>();
let loadPromise: Promise<void> | null = null;
// Items toggled before storage finished loading; the toggle wins.
let toggledBeforeLoad = new Set<string>();
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function parseStored(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
}

export function loadExpandedSubItems(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(EXPANDED_SUB_ITEMS_KEY)
      .catch(() => null)
      .then((raw) => {
        const next = new Set(parseStored(raw));
        toggledBeforeLoad.forEach((itemId) => {
          if (expanded.has(itemId)) {
            next.add(itemId);
          } else {
            next.delete(itemId);
          }
        });
        expanded = next;
        loaded = true;
        if (toggledBeforeLoad.size > 0) {
          toggledBeforeLoad = new Set();
          persist();
        }
        notify();
      });
  }
  return loadPromise;
}

export function isSubItemsExpanded(itemId: string): boolean {
  return expanded.has(itemId);
}

function persist() {
  void AsyncStorage.setItem(EXPANDED_SUB_ITEMS_KEY, JSON.stringify([...expanded])).catch(
    () => {
      // Ignore storage failures; the in-memory state still applies this session.
    },
  );
}

export function setSubItemsExpanded(itemId: string, value: boolean): void {
  if (!loaded) {
    toggledBeforeLoad.add(itemId);
  }
  if (expanded.has(itemId) === value) {
    return;
  }
  expanded = new Set(expanded);
  if (value) {
    expanded.add(itemId);
  } else {
    expanded.delete(itemId);
  }
  notify();
  // Before the stored set has loaded, writing now would drop its entries;
  // the load merges this toggle in and saves then.
  if (loaded) {
    persist();
  }
}

export function subscribeExpandedSubItems(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetExpandedSubItemsForTests(): void {
  expanded = new Set();
  loadPromise = null;
  toggledBeforeLoad = new Set();
  loaded = false;
  listeners.clear();
}
