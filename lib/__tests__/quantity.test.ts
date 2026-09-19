import {
  addQuantities,
  formatQuantity,
  parseNumber,
  parseQuantity,
} from '@/lib/quantity';

describe('parseNumber', () => {
  it('parses integers and decimals', () => {
    expect(parseNumber('3')).toBe(3);
    expect(parseNumber('2.5')).toBe(2.5);
  });

  it('parses simple fractions', () => {
    expect(parseNumber('1/2')).toBe(0.5);
    expect(parseNumber('3/4')).toBe(0.75);
  });

  it('parses mixed numbers', () => {
    expect(parseNumber('1 1/2')).toBe(1.5);
  });

  it('returns null for a zero denominator or non-numbers', () => {
    expect(parseNumber('1/0')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });
});

describe('parseQuantity', () => {
  it('parses a bare number as a count', () => {
    expect(parseQuantity('3')).toEqual({ kind: 'count', base: 3 });
  });

  it('parses mass units to grams', () => {
    expect(parseQuantity('250g')).toEqual({ kind: 'mass', base: 250 });
    expect(parseQuantity('1kg')).toEqual({ kind: 'mass', base: 1000 });
    expect(parseQuantity('1.5kg')).toEqual({ kind: 'mass', base: 1500 });
  });

  it('parses volume units to millilitres', () => {
    expect(parseQuantity('500ml')).toEqual({ kind: 'volume', base: 500 });
    expect(parseQuantity('2.5l')).toEqual({ kind: 'volume', base: 2500 });
    expect(parseQuantity('50cl')).toEqual({ kind: 'volume', base: 500 });
  });

  it('parses cooking units as their own kinds', () => {
    expect(parseQuantity('2cups')).toEqual({ kind: 'cup', base: 2 });
    expect(parseQuantity('1cup')).toEqual({ kind: 'cup', base: 1 });
    expect(parseQuantity('1tbsp')).toEqual({ kind: 'tbsp', base: 1 });
    expect(parseQuantity('2tsp')).toEqual({ kind: 'tsp', base: 2 });
  });

  it('parses fractions with cooking units', () => {
    expect(parseQuantity('1/2tsp')).toEqual({ kind: 'tsp', base: 0.5 });
    expect(parseQuantity('3/4cups')).toEqual({ kind: 'cup', base: 0.75 });
    expect(parseQuantity('1 1/2cups')).toEqual({ kind: 'cup', base: 1.5 });
  });

  it('is case-insensitive and tolerates spaces', () => {
    expect(parseQuantity(' 1 KG ')).toEqual({ kind: 'mass', base: 1000 });
    expect(parseQuantity('3/4 cups')).toEqual({ kind: 'cup', base: 0.75 });
  });

  it('returns null for non-numeric or unknown units', () => {
    expect(parseQuantity('a bunch')).toBeNull();
    expect(parseQuantity('2 packs')).toBeNull();
    expect(parseQuantity('')).toBeNull();
  });
});

describe('addQuantities', () => {
  it('sums same-kind quantities', () => {
    expect(addQuantities({ kind: 'mass', base: 250 }, { kind: 'mass', base: 250 })).toEqual({
      kind: 'mass',
      base: 500,
    });
  });

  it('returns null for different kinds', () => {
    expect(addQuantities({ kind: 'count', base: 2 }, { kind: 'mass', base: 500 })).toBeNull();
  });
});

describe('formatQuantity', () => {
  it('formats counts as plain numbers', () => {
    expect(formatQuantity({ kind: 'count', base: 5 })).toBe('5');
  });

  it('keeps the smallest sensible unit', () => {
    expect(formatQuantity({ kind: 'mass', base: 500 })).toBe('500g');
  });

  it('promotes to the largest unit >= 1 and trims trailing zeros', () => {
    expect(formatQuantity({ kind: 'mass', base: 1500 })).toBe('1.5kg');
    expect(formatQuantity({ kind: 'volume', base: 7500 })).toBe('7.5l');
    expect(formatQuantity({ kind: 'mass', base: 500 * 0.001 * 1000 })).toBe('500g');
  });

  it('formats sub-gram mass in milligrams', () => {
    expect(formatQuantity({ kind: 'mass', base: 0.5 })).toBe('500mg');
  });

  it('formats cooking units, pluralizing cups', () => {
    expect(formatQuantity({ kind: 'cup', base: 1 })).toBe('1cup');
    expect(formatQuantity({ kind: 'cup', base: 2 })).toBe('2cups');
    expect(formatQuantity({ kind: 'cup', base: 0.75 })).toBe('0.75cups');
    expect(formatQuantity({ kind: 'tbsp', base: 3 })).toBe('3tbsp');
    expect(formatQuantity({ kind: 'tsp', base: 0.5 })).toBe('0.5tsp');
  });
});

describe('addQuantities (cooking units)', () => {
  it('sums the same cooking unit', () => {
    expect(addQuantities({ kind: 'tsp', base: 0.5 }, { kind: 'tsp', base: 0.25 })).toEqual({
      kind: 'tsp',
      base: 0.75,
    });
  });

  it('does not combine different cooking units', () => {
    expect(addQuantities({ kind: 'cup', base: 1 }, { kind: 'tbsp', base: 1 })).toBeNull();
  });
});

import { combineItemQuantities } from '@/lib/quantity';

describe('combineItemQuantities', () => {
  it('sums two counts', () => {
    expect(
      combineItemQuantities({ kind: 'count', base: 3 }, { kind: 'count', base: 2 }),
    ).toEqual({ merged: true, quantity: { kind: 'count', base: 5 } });
  });

  it('treats a blank as count 1 when combining with a count', () => {
    expect(combineItemQuantities(null, { kind: 'count', base: 2 })).toEqual({
      merged: true,
      quantity: { kind: 'count', base: 3 },
    });
  });

  it('treats two blanks as count 2', () => {
    expect(combineItemQuantities(null, null)).toEqual({
      merged: true,
      quantity: { kind: 'count', base: 2 },
    });
  });

  it('does not merge a blank (count 1) with a measurement', () => {
    expect(combineItemQuantities(null, { kind: 'mass', base: 250 })).toEqual({
      merged: false,
    });
  });

  it('does not merge incompatible measurements', () => {
    expect(
      combineItemQuantities({ kind: 'mass', base: 250 }, { kind: 'volume', base: 250 }),
    ).toEqual({ merged: false });
  });
});
