import { parseItemEntries } from '@/lib/parseItemEntries';

describe('parseItemEntries', () => {
  it('splits a single entry into name and quantity', () => {
    expect(parseItemEntries('250g Chicken')).toEqual([
      { name: 'Chicken', quantity: { kind: 'mass', base: 250 } },
    ]);
  });

  it('parses a space-separated unit', () => {
    expect(parseItemEntries('250 g Chicken')).toEqual([
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

  it('parses cooking units attached to the number', () => {
    expect(parseItemEntries('2cups Flour')).toEqual([
      { name: 'Flour', quantity: { kind: 'cup', base: 2 } },
    ]);
    expect(parseItemEntries('1tbsp Oil')).toEqual([
      { name: 'Oil', quantity: { kind: 'tbsp', base: 1 } },
    ]);
  });

  it('parses a leading fraction as a quantity (the /4cups bug)', () => {
    expect(parseItemEntries('3/4cups Sugar')).toEqual([
      { name: 'Sugar', quantity: { kind: 'cup', base: 0.75 } },
    ]);
    expect(parseItemEntries('1/2tsp Salt')).toEqual([
      { name: 'Salt', quantity: { kind: 'tsp', base: 0.5 } },
    ]);
  });

  it('combines duplicate fractional cooking quantities', () => {
    expect(parseItemEntries('1/2tsp Salt, 1/4tsp Salt')).toEqual([
      { name: 'Salt', quantity: { kind: 'tsp', base: 0.75 } },
    ]);
    expect(parseItemEntries('3/4cups Flour, 1/4cups Flour')).toEqual([
      { name: 'Flour', quantity: { kind: 'cup', base: 1 } },
    ]);
  });

  it('parses a space-separated cooking unit and a mixed number', () => {
    expect(parseItemEntries('3/4 cups Sugar')).toEqual([
      { name: 'Sugar', quantity: { kind: 'cup', base: 0.75 } },
    ]);
    expect(parseItemEntries('1 1/2 cups Milk')).toEqual([
      { name: 'Milk', quantity: { kind: 'cup', base: 1.5 } },
    ]);
  });
});
