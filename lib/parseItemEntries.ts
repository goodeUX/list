import { itemMatchKey } from './itemName';
import {
  combineItemQuantities,
  KNOWN_UNIT_TOKENS,
  parseNumber,
  parseQuantity,
  type Quantity,
} from './quantity';

export interface ParsedEntry {
  name: string;
  quantity: Quantity | null;
}

// A leading number: a mixed number ("1 1/2"), a simple fraction ("3/4"), or a
// plain integer/decimal ("250", "2.5"). Ordered longest-match first.
const LEADING_NUMBER = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?`;
const LEADING_QUANTITY = new RegExp(`^(${LEADING_NUMBER})([a-zA-Z]*)(.*)$`);

export function extractLeadingQuantity(entry: string): ParsedEntry {
  const trimmed = entry.trim();
  const match = trimmed.match(LEADING_QUANTITY);
  if (!match) {
    return { name: trimmed, quantity: null };
  }

  const [, numberStr, attachedUnit, remainder] = match;

  // Unit attached to the number, e.g. "250g Chicken", "3/4cups sugar".
  if (attachedUnit) {
    if (KNOWN_UNIT_TOKENS.has(attachedUnit.toLowerCase())) {
      return {
        name: remainder.trim(),
        quantity: parseQuantity(`${numberStr}${attachedUnit}`),
      };
    }
    // Letters after the number that are not a unit (e.g. "3rd shelf") — the
    // whole entry is a name.
    return { name: trimmed, quantity: null };
  }

  const rest = remainder.trim();

  // Unit as a separate word, e.g. "250 g Chicken", "3/4 cups sugar".
  const firstWord = rest.match(/^([a-zA-Z]+)\b\s*(.*)$/);
  if (firstWord && KNOWN_UNIT_TOKENS.has(firstWord[1].toLowerCase())) {
    return {
      name: firstWord[2].trim(),
      quantity: parseQuantity(`${numberStr}${firstWord[1]}`),
    };
  }

  // Bare leading number = a count, e.g. "3 Oranges". A number with no name
  // after it stays a name (an item must have a name).
  if (!rest) {
    return { name: trimmed, quantity: null };
  }

  const count = parseNumber(numberStr);
  if (count === null) {
    return { name: trimmed, quantity: null };
  }

  return { name: rest, quantity: { kind: 'count', base: count } };
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
