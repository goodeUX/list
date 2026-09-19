import { itemMatchKey } from './itemName';
import {
  combineItemQuantities,
  parseQuantity,
  type Quantity,
} from './quantity';

export interface ParsedEntry {
  name: string;
  quantity: Quantity | null;
}

const KNOWN_UNITS = new Set(['mg', 'g', 'kg', 'ml', 'cl', 'l']);

export function extractLeadingQuantity(entry: string): ParsedEntry {
  const trimmed = entry.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)([a-zA-Z]*)(.*)$/);
  if (!match) {
    return { name: trimmed, quantity: null };
  }

  const [, numberStr, attachedUnit, remainder] = match;

  // Unit attached to the number, e.g. "250g Chicken" or "2.5l Water".
  if (attachedUnit) {
    if (KNOWN_UNITS.has(attachedUnit.toLowerCase())) {
      return {
        name: remainder.trim(),
        quantity: parseQuantity(numberStr + attachedUnit),
      };
    }
    // Letters after the number that are not a unit (e.g. "3rd shelf") — the
    // whole entry is a name.
    return { name: trimmed, quantity: null };
  }

  const rest = remainder.trim();

  // Unit as a separate word, e.g. "250 g Chicken".
  const firstWord = rest.match(/^([a-zA-Z]+)\b\s*(.*)$/);
  if (firstWord && KNOWN_UNITS.has(firstWord[1].toLowerCase())) {
    return {
      name: firstWord[2].trim(),
      quantity: parseQuantity(numberStr + firstWord[1]),
    };
  }

  // Bare leading number = a count, e.g. "3 Oranges". A number with no name
  // after it stays a name (an item must have a name).
  if (!rest) {
    return { name: trimmed, quantity: null };
  }

  return { name: rest, quantity: { kind: 'count', base: Number(numberStr) } };
}

function tryMergeInto(bucket: ParsedEntry[], incoming: ParsedEntry): boolean {
  for (const entry of bucket) {
    const combined = combineItemQuantities(entry.quantity, incoming.quantity);
    if (combined.merged) {
      entry.quantity = combined.quantity;
      return true;
    }
  }
  return false;
}

export function parseItemEntries(input: string): ParsedEntry[] {
  const order: string[] = [];
  const groups = new Map<string, ParsedEntry[]>();

  for (const part of input.split(',')) {
    const parsed = extractLeadingQuantity(part);
    if (!parsed.name) {
      continue;
    }

    const key = itemMatchKey(parsed.name);
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = [];
      groups.set(key, bucket);
      order.push(key);
    }

    if (!tryMergeInto(bucket, parsed)) {
      bucket.push(parsed);
    }
  }

  const result: ParsedEntry[] = [];
  for (const key of order) {
    result.push(...groups.get(key)!);
  }
  return result;
}
