import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  EXPANDED_SUB_ITEMS_KEY,
  isSubItemsExpanded,
  loadExpandedSubItems,
  resetExpandedSubItemsForTests,
  setSubItemsExpanded,
  subscribeExpandedSubItems,
} from '@/lib/subItemExpansion';

beforeEach(async () => {
  await AsyncStorage.clear();
  resetExpandedSubItemsForTests();
});

describe('sub-item expansion', () => {
  it('is collapsed by default', async () => {
    await loadExpandedSubItems();
    expect(isSubItemsExpanded('item-1')).toBe(false);
  });

  it('remembers expanded items across a reload from storage', async () => {
    await loadExpandedSubItems();
    setSubItemsExpanded('item-1', true);
    setSubItemsExpanded('item-2', true);
    setSubItemsExpanded('item-2', false);

    resetExpandedSubItemsForTests();
    await loadExpandedSubItems();

    expect(isSubItemsExpanded('item-1')).toBe(true);
    expect(isSubItemsExpanded('item-2')).toBe(false);
  });

  it('ignores corrupt stored data', async () => {
    await AsyncStorage.setItem(EXPANDED_SUB_ITEMS_KEY, '{not json');
    await loadExpandedSubItems();
    expect(isSubItemsExpanded('item-1')).toBe(false);
  });

  it('notifies subscribers when an item is toggled or storage loads', async () => {
    await AsyncStorage.setItem(EXPANDED_SUB_ITEMS_KEY, JSON.stringify(['item-1']));
    const listener = jest.fn();
    const unsubscribe = subscribeExpandedSubItems(listener);

    await loadExpandedSubItems();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(isSubItemsExpanded('item-1')).toBe(true);

    setSubItemsExpanded('item-3', true);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setSubItemsExpanded('item-3', false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps a toggle made before storage finished loading', async () => {
    await AsyncStorage.setItem(EXPANDED_SUB_ITEMS_KEY, JSON.stringify(['item-1']));
    const loading = loadExpandedSubItems();
    setSubItemsExpanded('item-1', false);
    await loading;
    expect(isSubItemsExpanded('item-1')).toBe(false);
  });

  it("doesn't overwrite stored items when toggling before storage has loaded", async () => {
    await AsyncStorage.setItem(EXPANDED_SUB_ITEMS_KEY, JSON.stringify(['item-1']));
    const loading = loadExpandedSubItems();
    setSubItemsExpanded('item-2', true);
    await loading;

    expect(isSubItemsExpanded('item-1')).toBe(true);
    expect(isSubItemsExpanded('item-2')).toBe(true);
    const stored = JSON.parse((await AsyncStorage.getItem(EXPANDED_SUB_ITEMS_KEY)) ?? '[]');
    expect(stored.sort()).toEqual(['item-1', 'item-2']);
  });
});
