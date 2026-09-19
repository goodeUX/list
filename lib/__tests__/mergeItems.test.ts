import { planItemMerges } from '@/lib/mergeItems';
import type { ParsedEntry } from '@/lib/parseItemEntries';
import type { ListItem } from '@/lib/types';

function makeItem(overrides: Partial<ListItem>): ListItem {
  const now = new Date();
  return {
    id: 'id',
    name: '',
    quantity: null,
    description: null,
    link: null,
    checked: false,
    order: 0,
    subItems: [],
    createdBy: 'local',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const entry = (name: string, quantity: ParsedEntry['quantity']): ParsedEntry => ({
  name,
  quantity,
});

describe('planItemMerges', () => {
  it('adds a new item when nothing matches', () => {
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 5 })], []),
    ).toEqual([{ type: 'add', name: 'Oranges', quantity: '5' }]);
  });

  it('adds a new item with no quantity when the entry has none', () => {
    expect(planItemMerges([entry('Milk', null)], [])).toEqual([
      { type: 'add', name: 'Milk', quantity: null },
    ]);
  });

  it('merges into an active existing item with the same name', () => {
    const items = [makeItem({ id: 'a', name: 'Oranges', quantity: '3' })];
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 2 })], items),
    ).toEqual([{ type: 'update', id: 'a', quantity: '5' }]);
  });

  it('treats an existing blank quantity as one', () => {
    const items = [makeItem({ id: 'a', name: 'Oranges', quantity: null })];
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 2 })], items),
    ).toEqual([{ type: 'update', id: 'a', quantity: '3' }]);
  });

  it('converts units when merging into an existing item', () => {
    const items = [makeItem({ id: 'a', name: 'Chicken', quantity: '500g' })];
    expect(
      planItemMerges([entry('Chicken', { kind: 'mass', base: 1000 })], items),
    ).toEqual([{ type: 'update', id: 'a', quantity: '1.5kg' }]);
  });

  it('ignores completed items when matching', () => {
    const items = [makeItem({ id: 'a', name: 'Oranges', quantity: '3', checked: true })];
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 2 })], items),
    ).toEqual([{ type: 'add', name: 'Oranges', quantity: '2' }]);
  });

  it('adds a new item when the existing quantity is incompatible', () => {
    const items = [makeItem({ id: 'a', name: 'Oranges', quantity: '500g' })];
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 2 })], items),
    ).toEqual([{ type: 'add', name: 'Oranges', quantity: '2' }]);
  });

  it('does not merge into an item with a non-numeric quantity', () => {
    const items = [makeItem({ id: 'a', name: 'Oranges', quantity: 'a bunch' })];
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 2 })], items),
    ).toEqual([{ type: 'add', name: 'Oranges', quantity: '2' }]);
  });
});
