import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppList, ListItem, NewItemFields } from '@/lib/types';

const STORAGE_KEY = 'list_app_local_data_v1';
const LEGACY_STORAGE_KEY = 'sage_local_data_v1';

type LocalDatabase = {
  lists: AppList[];
  itemsByListId: Record<string, ListItem[]>;
};

type Listener = () => void;

const listeners = new Set<Listener>();
let cache: LocalDatabase | null = null;

function createId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function emptyDatabase(): LocalDatabase {
  return { lists: [], itemsByListId: {} };
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

function normalizeList(list: AppList): AppList {
  return {
    ...list,
    createdAt: coerceDate(list.createdAt),
    updatedAt: coerceDate(list.updatedAt),
  };
}

function normalizeItem(item: ListItem): ListItem {
  return {
    ...item,
    createdAt: coerceDate(item.createdAt),
    updatedAt: coerceDate(item.updatedAt),
  };
}

function normalizeDatabase(data: LocalDatabase): LocalDatabase {
  return {
    lists: data.lists.map(normalizeList),
    itemsByListId: Object.fromEntries(
      Object.entries(data.itemsByListId).map(([listId, items]) => [
        listId,
        items.map(normalizeItem),
      ]),
    ),
  };
}

function serializeDatabase(data: LocalDatabase): string {
  return JSON.stringify(data, (_key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
}

function deserializeDatabase(raw: string): LocalDatabase {
  return JSON.parse(raw, (_key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  }) as LocalDatabase;
}

async function readDatabase(): Promise<LocalDatabase> {
  if (cache) {
    return cache;
  }

  let raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      await AsyncStorage.setItem(STORAGE_KEY, legacy);
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      raw = legacy;
    }
  }

  cache = raw ? normalizeDatabase(deserializeDatabase(raw)) : emptyDatabase();
  return cache;
}

async function writeDatabase(data: LocalDatabase): Promise<void> {
  const normalized = normalizeDatabase(data);
  cache = normalized;
  await AsyncStorage.setItem(STORAGE_KEY, serializeDatabase(normalized));
  listeners.forEach((listener) => listener());
}

export function subscribeLocalData(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getLocalLists(): Promise<AppList[]> {
  const data = await readDatabase();
  return [...data.lists].sort(
    (a, b) => coerceDate(b.updatedAt).getTime() - coerceDate(a.updatedAt).getTime(),
  );
}

export async function getLocalList(listId: string): Promise<AppList | null> {
  const data = await readDatabase();
  return data.lists.find((list) => list.id === listId) ?? null;
}

export function getCachedLocalList(listId: string): AppList | null {
  if (!cache) {
    return null;
  }

  return cache.lists.find((list) => list.id === listId) ?? null;
}

export async function createLocalList(
  name: string,
  emoji: string,
): Promise<AppList> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('List name is required');
  }

  const now = new Date();
  const list: AppList = {
    id: createId(),
    name: trimmedName,
    emoji: emoji || '📋',
    ownerId: 'local',
    memberIds: ['local'],
    createdAt: now,
    updatedAt: now,
  };

  const data = await readDatabase();
  data.lists.unshift(list);
  data.itemsByListId[list.id] = [];
  await writeDatabase(data);
  return list;
}

export async function getLocalItems(listId: string): Promise<ListItem[]> {
  const data = await readDatabase();
  const items = data.itemsByListId[listId] ?? [];
  return [...items].sort((a, b) => a.order - b.order);
}

export function getCachedLocalItems(listId: string): ListItem[] {
  if (!cache) {
    return [];
  }

  const items = cache.itemsByListId[listId] ?? [];
  return [...items].sort((a, b) => a.order - b.order);
}

export async function addLocalItem(
  listId: string,
  name: string,
  fields: NewItemFields = {},
): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return;
  }

  const data = await readDatabase();
  const list = data.lists.find((entry) => entry.id === listId);
  if (!list) {
    throw new Error('List not found');
  }

  const items = data.itemsByListId[listId] ?? [];
  const maxOrder = items.reduce((max, item) => Math.max(max, item.order), -1);
  const now = new Date();

  const item: ListItem = {
    id: createId(),
    name: trimmedName,
    quantity: fields.quantity ?? null,
    description: fields.description ?? null,
    link: fields.link ?? null,
    checked: false,
    order: maxOrder + 1,
    createdBy: 'local',
    createdAt: now,
    updatedAt: now,
  };

  data.itemsByListId[listId] = [...items, item];
  list.updatedAt = now;
  await writeDatabase(data);
}

export async function reorderLocalItems(
  listId: string,
  orderedIds: string[],
): Promise<void> {
  const data = await readDatabase();
  const items = data.itemsByListId[listId];
  if (!items) {
    return;
  }

  const orderById = new Map(orderedIds.map((id, index) => [id, index]));
  const now = new Date();

  for (const item of items) {
    const nextOrder = orderById.get(item.id);
    if (nextOrder !== undefined) {
      item.order = nextOrder;
      item.updatedAt = now;
    }
  }

  const list = data.lists.find((entry) => entry.id === listId);
  if (list) {
    list.updatedAt = now;
  }

  await writeDatabase(data);
}

export async function toggleLocalItem(
  listId: string,
  itemId: string,
): Promise<void> {
  const data = await readDatabase();
  const items = data.itemsByListId[listId];
  if (!items) {
    return;
  }

  const item = items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  item.checked = !item.checked;
  item.updatedAt = new Date();

  const list = data.lists.find((entry) => entry.id === listId);
  if (list) {
    list.updatedAt = new Date();
  }

  await writeDatabase(data);
}

export async function updateLocalItem(
  listId: string,
  itemId: string,
  updates: Partial<
    Pick<ListItem, 'name' | 'quantity' | 'description' | 'link' | 'checked' | 'order'>
  >,
): Promise<void> {
  const data = await readDatabase();
  const items = data.itemsByListId[listId];
  if (!items) {
    return;
  }

  const item = items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  Object.assign(item, updates, { updatedAt: new Date() });
  await writeDatabase(data);
}

export async function deleteLocalItem(
  listId: string,
  itemId: string,
): Promise<void> {
  const data = await readDatabase();
  const items = data.itemsByListId[listId];
  if (!items) {
    return;
  }

  data.itemsByListId[listId] = items.filter((entry) => entry.id !== itemId);
  await writeDatabase(data);
}

export async function clearLocalListItems(listId: string): Promise<void> {
  const data = await readDatabase();
  const list = data.lists.find((entry) => entry.id === listId);
  if (!list) {
    return;
  }

  data.itemsByListId[listId] = [];
  list.updatedAt = new Date();
  await writeDatabase(data);
}

export async function deleteLocalList(listId: string): Promise<void> {
  const data = await readDatabase();
  data.lists = data.lists.filter((entry) => entry.id !== listId);
  delete data.itemsByListId[listId];
  await writeDatabase(data);
}

export async function getLocalDatabaseSnapshot(): Promise<LocalDatabase> {
  const data = await readDatabase();
  return {
    lists: data.lists.map((list) => ({ ...list })),
    itemsByListId: Object.fromEntries(
      Object.entries(data.itemsByListId).map(([listId, items]) => [
        listId,
        items.map((item) => ({ ...item })),
      ]),
    ),
  };
}

export async function clearLocalDatabase(): Promise<void> {
  cache = emptyDatabase();
  await AsyncStorage.removeItem(STORAGE_KEY);
  listeners.forEach((listener) => listener());
}
