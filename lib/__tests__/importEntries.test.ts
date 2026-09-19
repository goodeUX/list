import { planImportWrites } from '@/lib/importPlan';
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

describe('planImportWrites', () => {
  it('adds into an empty list top-to-bottom (orders -2, -1, 0)', () => {
    expect(
      planImportWrites(
        [
          entry('Flour', { kind: 'cup', base: 2 }),
          entry('Sugar', { kind: 'cup', base: 1 }),
          entry('Salt', null),
        ],
        [],
      ),
    ).toEqual([
      { type: 'add', name: 'Flour', quantity: '2cups', order: -2 },
      { type: 'add', name: 'Sugar', quantity: '1cup', order: -1 },
      { type: 'add', name: 'Salt', quantity: null, order: 0 },
    ]);
  });

  it('adds below the existing minimum order with distinct orders', () => {
    const writes = planImportWrites(
      [entry('Eggs', { kind: 'count', base: 3 }), entry('Milk', null)],
      [makeItem({ id: 'a', name: 'Bread', order: 0 })],
    );
    expect(writes).toEqual([
      { type: 'add', name: 'Eggs', quantity: '3', order: -2 },
      { type: 'add', name: 'Milk', quantity: null, order: -1 },
    ]);
    const orders = writes.map((w) => (w.type === 'add' ? w.order : null));
    expect(new Set(orders).size).toBe(orders.length);
    orders.forEach((o) => expect(o).toBeLessThan(0));
  });

  it('updates a matching active item with the summed quantity, no add', () => {
    expect(
      planImportWrites(
        [entry('Flour', { kind: 'cup', base: 1 })],
        [makeItem({ id: 'f', name: 'flour', quantity: '2 cups', order: 0 })],
      ),
    ).toEqual([{ type: 'update', id: 'f', quantity: '3cups' }]);
  });

  it('returns an empty plan for no entries', () => {
    expect(planImportWrites([], [])).toEqual([]);
  });
});
