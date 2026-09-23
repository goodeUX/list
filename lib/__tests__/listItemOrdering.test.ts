import {
  groupItemsWithDoneAtBottom,
  nextItemOrder,
  orderAfterToggle,
  orderItemsAfterToggle,
  withSequentialOrder,
} from '@/lib/listItemOrdering';
import type { ListItem } from '@/lib/types';

function makeItem(id: string, order: number): ListItem {
  return {
    id,
    name: id,
    quantity: null,
    description: null,
    link: null,
    checked: false,
    order,
    subItems: [],
    createdBy: 'local',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('nextItemOrder', () => {
  it('starts at 0 for an empty list', () => {
    expect(nextItemOrder([])).toBe(0);
  });

  it('sorts a new item above everything already stored', () => {
    const items = [makeItem('a', 0), makeItem('b', 1), makeItem('c', 2)];
    const order = nextItemOrder(items);

    expect(order).toBe(-1);
    expect(Math.min(...items.map((item) => item.order))).toBeGreaterThan(order);
  });

  it('keeps stacking newest-first across repeated adds', () => {
    const items = [makeItem('a', 0)];
    const first = nextItemOrder(items);
    items.push(makeItem('b', first));
    const second = nextItemOrder(items);

    expect(first).toBe(-1);
    expect(second).toBe(-2);
  });

  it('goes below an already-negative minimum', () => {
    expect(nextItemOrder([makeItem('a', -3), makeItem('b', 0)])).toBe(-4);
  });

  it('never returns a positive order, even if every item is positive', () => {
    expect(nextItemOrder([makeItem('a', 5), makeItem('b', 9)])).toBe(-1);
  });

  it('places the new item first once the list is sorted by order', () => {
    const items = [makeItem('a', 0), makeItem('b', 1)];
    const added = makeItem('new', nextItemOrder(items));
    const sorted = [...items, added].sort((x, y) => x.order - y.order);

    expect(sorted.map((item) => item.id)).toEqual(['new', 'a', 'b']);
  });
});

describe('withSequentialOrder', () => {
  it('renumbers negative orders back to 0..n in place', () => {
    const items = [makeItem('new', -1), makeItem('a', 0), makeItem('b', 1)];
    expect(withSequentialOrder(items).map((item) => item.order)).toEqual([0, 1, 2]);
  });

  it('leaves an already-sequential list untouched by reference', () => {
    const items = [makeItem('a', 0), makeItem('b', 1)];
    const result = withSequentialOrder(items);

    expect(result[0]).toBe(items[0]);
    expect(result[1]).toBe(items[1]);
  });
});

describe('orderAfterToggle', () => {
  function withChecked(id: string, order: number, checked: boolean): ListItem {
    return { ...makeItem(id, order), checked };
  }

  function groupedIds(items: ListItem[], toggledId: string, newOrder: number): string[] {
    const next = items.map((item) =>
      item.id === toggledId ? { ...item, checked: !item.checked, order: newOrder } : item,
    );
    return groupItemsWithDoneAtBottom(next).map((item) => item.id);
  }

  it('moves a newly done item to the end of the done items, changing only its order', () => {
    const items = [
      withChecked('a', 0, false),
      withChecked('b', 1, false),
      withChecked('c', 2, true),
      withChecked('d', 3, true),
    ];
    const order = orderAfterToggle(items, 'a');

    expect(groupedIds(items, 'a', order)).toEqual(
      orderItemsAfterToggle(items, 'a').map((item) => item.id),
    );
    expect(order).toBe(4);
  });

  it('moves an undone item to the end of the to-dos, before the done items', () => {
    const items = [
      withChecked('a', 0, false),
      withChecked('b', 1, false),
      withChecked('c', 2, true),
      withChecked('d', 3, true),
    ];
    const order = orderAfterToggle(items, 'd');

    expect(groupedIds(items, 'd', order)).toEqual(
      orderItemsAfterToggle(items, 'd').map((item) => item.id),
    );
    expect(order).toBeGreaterThan(1);
    expect(order).toBeLessThan(2);
  });

  it('handles lists with no to-dos or no done items', () => {
    const allDone = [withChecked('a', 0, true), withChecked('b', 1, true)];
    expect(orderAfterToggle(allDone, 'b')).toBeLessThan(0);

    const noneDone = [withChecked('a', 0, false), withChecked('b', 1, false)];
    expect(orderAfterToggle(noneDone, 'a')).toBe(2);
  });

  it('keeps the toggled item last in its group even when orders are out of step', () => {
    // A done item sorted before a to-do by order (not grouped by order).
    const items = [
      withChecked('a', 5, false),
      withChecked('b', 1, true),
      withChecked('c', 2, false),
    ];
    const order = orderAfterToggle(items, 'b');
    const next = items.map((item) =>
      item.id === 'b' ? { ...item, checked: false, order } : item,
    );
    const todos = next.filter((item) => !item.checked).sort((x, y) => x.order - y.order);
    expect(todos.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });
});
