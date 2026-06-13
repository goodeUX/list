import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ItemHistoryEntry } from '@/lib/types';

const HISTORY_KEY = 'list_app_item_history_v1';
const LEGACY_HISTORY_KEY = 'sage_item_history_v1';

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: ItemHistoryEntry[] | null = null;

function createId(): string {
  return `hist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function coerceDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    '__type' in value &&
    (value as { __type: string }).__type === 'Date' &&
    'value' in value
  ) {
    return new Date((value as { value: string }).value);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function normalizeEntry(entry: ItemHistoryEntry): ItemHistoryEntry {
  return {
    ...entry,
    lastUsedAt: coerceDate(entry.lastUsedAt),
  };
}

function serialize(entries: ItemHistoryEntry[]): string {
  return JSON.stringify(entries, (_key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
}

function deserialize(raw: string): ItemHistoryEntry[] {
  return JSON.parse(raw, (_key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  }) as ItemHistoryEntry[];
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

async function readHistory(): Promise<ItemHistoryEntry[]> {
  if (cache) {
    return cache;
  }

  let raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) {
    const legacy = await AsyncStorage.getItem(LEGACY_HISTORY_KEY);
    if (legacy) {
      await AsyncStorage.setItem(HISTORY_KEY, legacy);
      await AsyncStorage.removeItem(LEGACY_HISTORY_KEY);
      raw = legacy;
    }
  }

  cache = raw ? deserialize(raw).map(normalizeEntry) : [];
  return cache;
}

async function writeHistory(entries: ItemHistoryEntry[]): Promise<void> {
  cache = entries;
  await AsyncStorage.setItem(HISTORY_KEY, serialize(entries));
  notify();
}

export function subscribeLocalHistory(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getLocalItemHistory(): Promise<ItemHistoryEntry[]> {
  const entries = await readHistory();
  return [...entries].sort(
    (a, b) => coerceDate(b.lastUsedAt).getTime() - coerceDate(a.lastUsedAt).getTime(),
  );
}

export async function recordLocalItemUsage(
  name: string,
  quantity: string | null,
  listId: string,
): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return;
  }

  const entries = await readHistory();
  const normalized = trimmedName.toLowerCase();
  const existing = entries.find(
    (entry) => entry.name.trim().toLowerCase() === normalized,
  );
  const now = new Date();

  if (existing) {
    existing.lastUsedAt = now;
    existing.useCount += 1;
    existing.lastListId = listId;
    if (quantity) {
      existing.quantity = quantity;
    }
  } else {
    entries.unshift({
      id: createId(),
      name: trimmedName,
      quantity,
      lastUsedAt: now,
      useCount: 1,
      lastListId: listId,
    });
  }

  await writeHistory(entries);
}

export async function getLocalHistorySnapshot(): Promise<ItemHistoryEntry[]> {
  const entries = await readHistory();
  return entries.map((entry) => ({ ...entry }));
}

export async function clearLocalHistory(): Promise<void> {
  cache = [];
  await AsyncStorage.removeItem(HISTORY_KEY);
  notify();
}
