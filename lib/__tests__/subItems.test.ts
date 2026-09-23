import {
  addSubItem,
  addSubItems,
  parseSubItems,
  removeSubItem,
  renameSubItem,
  reorderSubItems,
  sortSubItems,
  subItemProgress,
  subItemsEqual,
  toggleSubItem,
} from '@/lib/subItems';
import type { SubItem } from '@/lib/types';

function make(overrides: Partial<SubItem> & { id: string }): SubItem {
  return { name: 'x', checked: false, order: 0, ...overrides };
}

describe('addSubItem', () => {
  it('appends a normalized sub-item with the next order', () => {
    const start = [make({ id: 'a', order: 0 })];
    const next = addSubItem(start, '  Milk  ', 'b');
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ id: 'b', name: 'Milk', checked: false, order: 1 });
  });

  it('ignores an empty name', () => {
    const start = [make({ id: 'a' })];
    expect(addSubItem(start, '   ', 'b')).toBe(start);
  });
});

describe('addSubItems', () => {
  it('adds each comma-separated entry at the top, in typed order', () => {
    const start = [
      make({ id: 'a', name: 'Milk', order: 0 }),
      make({ id: 'b', name: 'Bread', order: 1 }),
    ];
    let n = 0;
    const next = addSubItems(start, ' Salt, 2 eggs ,Oil', () => `new${(n += 1)}`);
    expect(next.map((s) => [s.id, s.name, s.order])).toEqual([
      ['new1', 'Salt', 0],
      ['new2', '2 eggs', 1],
      ['new3', 'Oil', 2],
      ['a', 'Milk', 3],
      ['b', 'Bread', 4],
    ]);
  });

  it('skips empty entries and returns the input when nothing is added', () => {
    const start = [make({ id: 'a' })];
    expect(addSubItems(start, ' , ,', () => 'x')).toBe(start);
    expect(addSubItems(start, 'Salt,,', () => 'b').map((s) => s.name)).toEqual(['Salt', 'x']);
  });
});

describe('removeSubItem', () => {
  it('removes by id and resequences order', () => {
    const start = [
      make({ id: 'a', order: 0 }),
      make({ id: 'b', order: 1 }),
      make({ id: 'c', order: 2 }),
    ];
    const next = removeSubItem(start, 'b');
    expect(next.map((s) => s.id)).toEqual(['a', 'c']);
    expect(next.map((s) => s.order)).toEqual([0, 1]);
  });
});

describe('renameSubItem', () => {
  it('renames the matching sub-item, normalized', () => {
    const start = [make({ id: 'a', name: 'old' })];
    expect(renameSubItem(start, 'a', '  New  ')[0].name).toBe('New');
  });

  it('keeps the old name when the new name is blank', () => {
    const start = [make({ id: 'a', name: 'old' })];
    expect(renameSubItem(start, 'a', '   ')[0].name).toBe('old');
  });
});

describe('toggleSubItem', () => {
  it('flips checked for the matching id only', () => {
    const start = [make({ id: 'a', checked: false }), make({ id: 'b', checked: false })];
    const next = toggleSubItem(start, 'a');
    expect(next[0].checked).toBe(true);
    expect(next[1].checked).toBe(false);
  });
});

describe('reorderSubItems', () => {
  it('reorders by the given ids and resequences order', () => {
    const start = [
      make({ id: 'a', order: 0 }),
      make({ id: 'b', order: 1 }),
      make({ id: 'c', order: 2 }),
    ];
    const next = reorderSubItems(start, ['c', 'a', 'b']);
    expect(next.map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(next.map((s) => s.order)).toEqual([0, 1, 2]);
  });
});

describe('sortSubItems', () => {
  it('sorts by order without mutating input', () => {
    const start = [make({ id: 'b', order: 1 }), make({ id: 'a', order: 0 })];
    expect(sortSubItems(start).map((s) => s.id)).toEqual(['a', 'b']);
    expect(start.map((s) => s.id)).toEqual(['b', 'a']);
  });
});

describe('subItemsEqual', () => {
  it('is true for the same reference and for equal contents', () => {
    const list = [make({ id: 'a', name: 'A', checked: true, order: 0 })];
    expect(subItemsEqual(list, list)).toBe(true);
    expect(
      subItemsEqual(list, [make({ id: 'a', name: 'A', checked: true, order: 0 })]),
    ).toBe(true);
  });

  it('is false when length, order, name, or checked differ', () => {
    const base = [make({ id: 'a', name: 'A', checked: false, order: 0 })];
    expect(subItemsEqual(base, [])).toBe(false);
    expect(
      subItemsEqual(base, [make({ id: 'a', name: 'B', checked: false, order: 0 })]),
    ).toBe(false);
    expect(
      subItemsEqual(base, [make({ id: 'a', name: 'A', checked: true, order: 0 })]),
    ).toBe(false);
    expect(
      subItemsEqual(base, [make({ id: 'a', name: 'A', checked: false, order: 1 })]),
    ).toBe(false);
  });
});

describe('subItemProgress', () => {
  it('counts done and total', () => {
    const start = [
      make({ id: 'a', checked: true }),
      make({ id: 'b', checked: false }),
      make({ id: 'c', checked: true }),
    ];
    expect(subItemProgress(start)).toEqual({ done: 2, total: 3 });
  });
});

describe('parseSubItems', () => {
  it('returns [] for non-arrays', () => {
    expect(parseSubItems(undefined)).toEqual([]);
    expect(parseSubItems(null)).toEqual([]);
    expect(parseSubItems('nope')).toEqual([]);
  });

  it('drops malformed entries and resequences order', () => {
    const raw = [
      { id: 'a', name: 'A', checked: true, order: 5 },
      { id: 'b', name: 'B' },
      { name: 'no id' },
      null,
      42,
    ];
    expect(parseSubItems(raw)).toEqual([
      { id: 'a', name: 'A', checked: true, order: 0 },
      { id: 'b', name: 'B', checked: false, order: 1 },
    ]);
  });
});
