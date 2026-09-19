import { itemMatchKey } from '@/lib/itemName';

describe('itemMatchKey', () => {
  it('lowercases and trims', () => {
    expect(itemMatchKey('  Milk ')).toBe('milk');
  });

  it('folds a single trailing s so singular and plural match', () => {
    expect(itemMatchKey('Oranges')).toBe(itemMatchKey('orange'));
    expect(itemMatchKey('Apple')).toBe(itemMatchKey('apples'));
  });

  it('does not fold very short names', () => {
    expect(itemMatchKey('is')).toBe('is');
  });
});
