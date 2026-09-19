import {
  addQuantities,
  formatQuantity,
  parseQuantity,
} from '@/lib/quantity';

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

  it('is case-insensitive and tolerates spaces', () => {
    expect(parseQuantity(' 1 KG ')).toEqual({ kind: 'mass', base: 1000 });
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
