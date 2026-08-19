import {
  customOrderFrom,
  isCustomOrder,
  isListSortMode,
  pruneCustomOrder,
  sortLists,
} from '@/lib/listSort';
import type { AppList } from '@/lib/types';

function makeList(id: string, name: string, updatedAtIso: string): AppList {
  return {
    id,
    name,
    emoji: '📋',
    ownerId: 'owner',
    memberIds: ['owner'],
    moveDoneToBottom: false,
    createdAt: new Date(updatedAtIso),
    updatedAt: new Date(updatedAtIso),
  };
}

const groceries = makeList('a', 'Groceries', '2026-01-03T00:00:00Z');
const books = makeList('b', 'books', '2026-01-01T00:00:00Z');
const trip = makeList('c', 'Trip', '2026-01-02T00:00:00Z');
const lists = [groceries, books, trip];

function ids(sorted: AppList[]): string[] {
  return sorted.map((list) => list.id);
}

describe('isListSortMode', () => {
  it('accepts the three modes', () => {
    expect(isListSortMode('alphabetical')).toBe(true);
    expect(isListSortMode('recent')).toBe(true);
    expect(isListSortMode('custom')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isListSortMode('chronological')).toBe(false);
    expect(isListSortMode(undefined)).toBe(false);
    expect(isListSortMode(2)).toBe(false);
  });
});

describe('isCustomOrder', () => {
  it('accepts arrays of strings, including empty', () => {
    expect(isCustomOrder([])).toBe(true);
    expect(isCustomOrder(['a', 'b'])).toBe(true);
  });

  it('rejects non-arrays and mixed arrays', () => {
    expect(isCustomOrder('a,b')).toBe(false);
    expect(isCustomOrder(['a', 3])).toBe(false);
    expect(isCustomOrder(null)).toBe(false);
  });
});

describe('sortLists', () => {
  it('sorts alphabetically, ignoring case', () => {
    expect(ids(sortLists(lists, 'alphabetical', []))).toEqual(['b', 'a', 'c']);
  });

  it('breaks alphabetical ties with the most recently updated first', () => {
    const older = makeList('old', 'Same', '2026-01-01T00:00:00Z');
    const newer = makeList('new', 'same', '2026-01-05T00:00:00Z');
    expect(ids(sortLists([older, newer], 'alphabetical', []))).toEqual(['new', 'old']);
  });

  it('sorts by most recently updated', () => {
    expect(ids(sortLists(lists, 'recent', []))).toEqual(['a', 'c', 'b']);
  });

  it('follows the custom order when every list is known', () => {
    expect(ids(sortLists(lists, 'custom', ['c', 'a', 'b']))).toEqual(['c', 'a', 'b']);
  });

  it('puts lists missing from the custom order on top, most recent first', () => {
    expect(ids(sortLists(lists, 'custom', ['b']))).toEqual(['a', 'c', 'b']);
  });

  it('ignores ids in the custom order whose list is gone', () => {
    expect(ids(sortLists(lists, 'custom', ['gone', 'c', 'a', 'b']))).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('falls back to most recent first when the custom order is empty', () => {
    expect(ids(sortLists(lists, 'custom', []))).toEqual(['a', 'c', 'b']);
  });

  it('does not mutate the input', () => {
    const input = [...lists];
    sortLists(input, 'alphabetical', []);
    expect(ids(input)).toEqual(['a', 'b', 'c']);
  });
});

describe('customOrderFrom', () => {
  it('takes the ids in displayed order', () => {
    expect(customOrderFrom(sortLists(lists, 'alphabetical', []))).toEqual([
      'b',
      'a',
      'c',
    ]);
  });
});

describe('pruneCustomOrder', () => {
  it('drops ids with no matching list and keeps the rest in order', () => {
    expect(pruneCustomOrder(['gone', 'c', 'a', 'also-gone', 'b'], lists)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });
});
