export type QuantityKind = 'count' | 'mass' | 'volume' | 'cup' | 'tbsp' | 'tsp';

export interface Quantity {
  kind: QuantityKind;
  /**
   * Normalized amount: count = units, mass = grams, volume = millilitres,
   * cooking units (cup/tbsp/tsp) = that unit's own count (no cross-conversion).
   */
  base: number;
}

interface UnitDef {
  kind: QuantityKind;
  factor: number;
}

// Unit token -> kind + factor to base unit. Cooking units are deliberately
// each their own kind with factor 1: cups, tablespoons and teaspoons only ever
// combine with the same unit, never converted into one another.
const UNITS: Record<string, UnitDef> = {
  mg: { kind: 'mass', factor: 0.001 },
  g: { kind: 'mass', factor: 1 },
  kg: { kind: 'mass', factor: 1000 },
  ml: { kind: 'volume', factor: 1 },
  cl: { kind: 'volume', factor: 10 },
  l: { kind: 'volume', factor: 1000 },
  cup: { kind: 'cup', factor: 1 },
  cups: { kind: 'cup', factor: 1 },
  tbsp: { kind: 'tbsp', factor: 1 },
  tbsps: { kind: 'tbsp', factor: 1 },
  tsp: { kind: 'tsp', factor: 1 },
  tsps: { kind: 'tsp', factor: 1 },
};

/** Every unit token recognized by the parser, exported for the tokenizer. */
export const KNOWN_UNIT_TOKENS = new Set(Object.keys(UNITS));

// Display units per kind, largest factor first, for promotion.
const DISPLAY_UNITS: Record<QuantityKind, { unit: string; factor: number }[]> = {
  count: [{ unit: '', factor: 1 }],
  mass: [
    { unit: 'kg', factor: 1000 },
    { unit: 'g', factor: 1 },
    { unit: 'mg', factor: 0.001 },
  ],
  volume: [
    { unit: 'l', factor: 1000 },
    { unit: 'ml', factor: 1 },
  ],
  cup: [{ unit: 'cup', factor: 1 }],
  tbsp: [{ unit: 'tbsp', factor: 1 }],
  tsp: [{ unit: 'tsp', factor: 1 }],
};

/**
 * Parse a number that may be an integer, decimal, simple fraction ("3/4"), or
 * mixed number ("1 1/2"). Returns null for anything else or a zero denominator.
 */
export function parseNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (denominator === 0) {
      return null;
    }
    return Number(mixed[1]) + Number(mixed[2]) / denominator;
  }

  const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) {
      return null;
    }
    return Number(fraction[1]) / denominator;
  }

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return null;
}

export function parseQuantity(input: string): Quantity | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*([a-z]*)$/,
  );
  if (!match) {
    return null;
  }

  const value = parseNumber(match[1]);
  if (value === null) {
    return null;
  }

  const unitToken = match[2];
  if (!unitToken) {
    return { kind: 'count', base: value };
  }

  const unit = UNITS[unitToken];
  if (!unit) {
    return null;
  }

  return { kind: unit.kind, base: value * unit.factor };
}

export function addQuantities(a: Quantity, b: Quantity): Quantity | null {
  if (a.kind !== b.kind) {
    return null;
  }
  return { kind: a.kind, base: a.base + b.base };
}

function trimNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

// "cup" is the only recognized unit that reads oddly unpluralized; tbsp/tsp are
// invariant abbreviations and the metric/count units are never pluralized.
function displayUnitLabel(kind: QuantityKind, unit: string, value: number): string {
  if (kind === 'cup') {
    return value === 1 ? 'cup' : 'cups';
  }
  return unit;
}

export function formatQuantity(quantity: Quantity): string {
  const units = DISPLAY_UNITS[quantity.kind];
  for (const { unit, factor } of units) {
    if (quantity.base >= factor) {
      const value = quantity.base / factor;
      return `${trimNumber(value)}${displayUnitLabel(quantity.kind, unit, value)}`;
    }
  }

  const smallest = units[units.length - 1];
  const value = quantity.base / smallest.factor;
  return `${trimNumber(value)}${displayUnitLabel(quantity.kind, smallest.unit, value)}`;
}

export type CombineResult =
  | { merged: true; quantity: Quantity }
  | { merged: false };

function asCombinable(quantity: Quantity | null): Quantity {
  return quantity ?? { kind: 'count', base: 1 };
}

export function combineItemQuantities(
  a: Quantity | null,
  b: Quantity | null,
): CombineResult {
  const combined = addQuantities(asCombinable(a), asCombinable(b));
  if (!combined) {
    return { merged: false };
  }
  return { merged: true, quantity: combined };
}
