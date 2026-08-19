import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  deleteLocalListHistory,
  getLocalListHistory,
  MAX_LIST_HISTORY_ENTRIES,
  recordLocalListName,
  seedLocalListHistory,
} from '@/lib/localListHistory';

beforeEach(async () => {
  await deleteLocalListHistory('list-1');
  await deleteLocalListHistory('list-2');
  await AsyncStorage.clear();
});

describe('recordLocalListName', () => {
  it('stores a new name with a use count of one', async () => {
    await recordLocalListName('list-1', 'Chocolate');

    expect(await getLocalListHistory('list-1')).toEqual([
      expect.objectContaining({ name: 'Chocolate', useCount: 1 }),
    ]);
  });

  it('increments the use count when the same name is recorded again', async () => {
    await recordLocalListName('list-1', 'Chocolate');
    await recordLocalListName('list-1', 'chocolate');

    const history = await getLocalListHistory('list-1');

    expect(history).toHaveLength(1);
    expect(history[0].useCount).toBe(2);
  });

  it('keeps the name as it was first written', async () => {
    await recordLocalListName('list-1', 'Chocolate');
    await recordLocalListName('list-1', 'chocolate');

    expect((await getLocalListHistory('list-1'))[0].name).toBe('Chocolate');
  });

  it('ignores a blank name', async () => {
    await recordLocalListName('list-1', '   ');

    expect(await getLocalListHistory('list-1')).toEqual([]);
  });

  it('keeps each list history separate', async () => {
    await recordLocalListName('list-1', 'Chocolate');
    await recordLocalListName('list-2', 'Cheese');

    expect((await getLocalListHistory('list-1')).map((entry) => entry.name)).toEqual([
      'Chocolate',
    ]);
    expect((await getLocalListHistory('list-2')).map((entry) => entry.name)).toEqual([
      'Cheese',
    ]);
  });

  it('drops the least-used entry once the cap is passed', async () => {
    for (let index = 0; index < MAX_LIST_HISTORY_ENTRIES; index += 1) {
      await recordLocalListName('list-1', `item ${index}`);
    }
    // Give one entry a second use so it outranks the rest.
    await recordLocalListName('list-1', 'item 0');
    await recordLocalListName('list-1', 'one too many');

    const history = await getLocalListHistory('list-1');
    const stored = history.map((entry) => entry.name);

    expect(history).toHaveLength(MAX_LIST_HISTORY_ENTRIES);
    expect(stored).toContain('item 0');
    expect(stored).toContain('one too many');
    expect(stored).not.toContain('item 1');
  });
});

describe('seedLocalListHistory', () => {
  it('fills an empty history from the given names', async () => {
    await seedLocalListHistory('list-1', ['Chocolate', 'Cheese']);

    expect((await getLocalListHistory('list-1')).map((entry) => entry.name).sort()).toEqual(
      ['Cheese', 'Chocolate'],
    );
  });

  it('leaves a history that already has entries alone', async () => {
    await recordLocalListName('list-1', 'Chocolate');
    await seedLocalListHistory('list-1', ['Cheese']);

    expect((await getLocalListHistory('list-1')).map((entry) => entry.name)).toEqual([
      'Chocolate',
    ]);
  });
});

describe('deleteLocalListHistory', () => {
  it('removes the history of that list only', async () => {
    await recordLocalListName('list-1', 'Chocolate');
    await recordLocalListName('list-2', 'Cheese');

    await deleteLocalListHistory('list-1');

    expect(await getLocalListHistory('list-1')).toEqual([]);
    expect(await getLocalListHistory('list-2')).toHaveLength(1);
  });
});
