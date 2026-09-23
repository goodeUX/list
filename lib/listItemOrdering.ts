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

/**
 * The `order` that places a toggled item where `orderItemsAfterToggle` puts
 * it — last among the done items when checked, last among the to-dos when
 * unchecked — without renumbering anything else, so a toggle is one write
 * rather than one per item. Orders may be fractional or negative.
 */
export function orderAfterToggle(items: ListItem[], itemId: string): number {
  const item = items.find((entry) => entry.id === itemId);
  if (!item) {
    return 0;
  }

  const others = items.filter((entry) => entry.id !== itemId);
  if (others.length === 0) {
    return item.order;
  }

  if (!item.checked) {
    // Becoming done: after everything.
    return Math.max(...others.map((entry) => entry.order)) + 1;
  }

  // Becoming a to-do: after the other to-dos, before the done items.
  const todoOrders = others.filter((entry) => !entry.checked).map((entry) => entry.order);
  const doneOrders = others.filter((entry) => entry.checked).map((entry) => entry.order);
  const lastTodo = todoOrders.length > 0 ? Math.max(...todoOrders) : null;
  const firstDone = doneOrders.length > 0 ? Math.min(...doneOrders) : null;

  if (lastTodo === null) {
    return (firstDone ?? 0) - 1;
  }
  if (firstDone !== null && lastTodo < firstDone) {
    return (lastTodo + firstDone) / 2;
  }
  return lastTodo + 1;
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
