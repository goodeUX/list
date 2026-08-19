import type { ListItem } from '@/lib/types';

function byOrder(a: ListItem, b: ListItem): number {
  return a.order - b.order;
}

/**
 * The `order` for a newly added item, which goes to the TOP of the list.
 *
 * Returns one below the current minimum rather than renumbering everything,
 * so adding an item is a single write no matter how long the list is. Orders
 * are free to go negative; reorders renumber back to 0..n via
 * `withSequentialOrder`.
 */
export function nextItemOrder(items: ListItem[]): number {
  if (items.length === 0) {
    return 0;
  }

  return items.reduce((min, item) => Math.min(min, item.order), 0) - 1;
}

export function groupItemsWithDoneAtBottom(items: ListItem[]): ListItem[] {
  const todos = items.filter((item) => !item.checked).sort(byOrder);
  const dones = items.filter((item) => item.checked).sort(byOrder);
  return [...todos, ...dones];
}

export function orderItemsAfterToggle(
  items: ListItem[],
  itemId: string,
): ListItem[] {
  const item = items.find((entry) => entry.id === itemId);
  if (!item) {
    return items;
  }

  const willBeChecked = !item.checked;
  const others = items.filter((entry) => entry.id !== itemId);
  const todos = others.filter((entry) => !entry.checked).sort(byOrder);
  const dones = others.filter((entry) => entry.checked).sort(byOrder);
  const toggledItem = { ...item, checked: willBeChecked };

  if (willBeChecked) {
    return [...todos, ...dones, toggledItem];
  }

  return [...todos, toggledItem, ...dones];
}

export function withSequentialOrder(items: ListItem[]): ListItem[] {
  return items.map((item, index) => {
    if (item.order === index) {
      return item;
    }

    return {
      ...item,
      order: index,
    };
  });
}
