export type QuantityKind = 'count' | 'mass' | 'volume';

export interface Quantity {
  kind: QuantityKind;
  /** Normalized amount: count = units, mass = grams, volume = millilitres. */
  base: number;
}

interface UnitDef {
  kind: QuantityKind;
  factor: number;
}

// Unit token -> kind + factor to base unit.
const UNITS: Record<string, UnitDef> = {
  mg: { kind: 'mass', factor: 0.001 },
  g: { kind: 'mass', factor: 1 },
  kg: { kind: 'mass', factor: 1000 },
  ml: { kind: 'volume', factor: 1 },
  cl: { kind: 'volume', factor: 10 },
  l: { kind: 'volume', factor: 1000 },
};

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
};

export function parseQuantity(input: string): Quantity | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-z]*)$/);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
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

export function formatQuantity(quantity: Quantity): string {
  const units = DISPLAY_UNITS[quantity.kind];
  for (const { unit, factor } of units) {
    if (quantity.base >= factor) {
      return `${trimNumber(quantity.base / factor)}${unit}`;
    }
  }

  const smallest = units[units.length - 1];
  return `${trimNumber(quantity.base / smallest.factor)}${smallest.unit}`;
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
