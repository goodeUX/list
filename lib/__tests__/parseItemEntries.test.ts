import { parseItemEntries } from '@/lib/parseItemEntries';

describe('parseItemEntries', () => {
  it('splits a single entry into name and quantity', () => {
    expect(parseItemEntries('250g Chicken')).toEqual([
      { name: 'Chicken', quantity: { kind: 'mass', base: 250 } },
    ]);
  });

  it('treats a leading bare number as a count', () => {
    expect(parseItemEntries('3 Oranges')).toEqual([
      { name: 'Oranges', quantity: { kind: 'count', base: 3 } },
    ]);
  });

  it('keeps an entry with no quantity', () => {
    expect(parseItemEntries('Milk')).toEqual([{ name: 'Milk', quantity: null }]);
  });

  it('sums duplicate counts within the batch', () => {
    expect(parseItemEntries('3 Oranges, 2 Oranges')).toEqual([
      { name: 'Oranges', quantity: { kind: 'count', base: 5 } },
    ]);
  });

  it('sums duplicate masses within the batch', () => {
    expect(parseItemEntries('250g Chicken, 250g Chicken')).toEqual([
      { name: 'Chicken', quantity: { kind: 'mass', base: 500 } },
    ]);
  });

  it('converts and combines compatible units', () => {
    expect(parseItemEntries('500g Chicken, 1kg Chicken')).toEqual([
      { name: 'Chicken', quantity: { kind: 'mass', base: 1500 } },
    ]);
    expect(parseItemEntries('2.5l Water, 5l Water')).toEqual([
      { name: 'Water', quantity: { kind: 'volume', base: 7500 } },
    ]);
  });

  it('matches names case-insensitively and across plurals', () => {
    expect(parseItemEntries('3 orange, 2 Oranges')).toEqual([
      { name: 'orange', quantity: { kind: 'count', base: 5 } },
    ]);
  });

  it('keeps incompatible same-name entries separate', () => {
    expect(parseItemEntries('2 Oranges, 500g Oranges')).toEqual([
      { name: 'Oranges', quantity: { kind: 'count', base: 2 } },
      { name: 'Oranges', quantity: { kind: 'mass', base: 500 } },
    ]);
  });

  it('skips blank entries and preserves first-seen order', () => {
    expect(parseItemEntries('Milk, , 2 Eggs')).toEqual([
      { name: 'Milk', quantity: null },
      { name: 'Eggs', quantity: { kind: 'count', base: 2 } },
    ]);
  });

  it('leaves a leading number with an unknown unit as part of the name', () => {
    expect(parseItemEntries('2 packs sausages')).toEqual([
      { name: 'packs sausages', quantity: { kind: 'count', base: 2 } },
    ]);
  });
});
