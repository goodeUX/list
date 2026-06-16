import type { ListItem } from '@/lib/types';

function byOrder(a: ListItem, b: ListItem): number {
  return a.order - b.order;
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
