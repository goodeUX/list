# Multi-entry Add with Quantity Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the list page's "add an item" input accept comma-separated entries, parse counts/weights/volumes out into the `quantity` field, and merge duplicates (within the batch and against active existing items) by summing quantities.

**Architecture:** Pure, unit-tested modules do all parsing and merge planning (`lib/quantity.ts`, `lib/parseItemEntries.ts`, `lib/mergeItems.ts`, plus an `itemMatchKey` helper in `lib/itemName.ts`). The `useListItems` hook gains a thin `addOrMergeItems` that runs the plan through the existing `addItem`/`updateItem` write paths. The list screen calls it from the existing submit flow.

**Tech Stack:** TypeScript, React Native / Expo, Jest (jest-expo), Firestore + local store (both reached via existing hook methods).

---

## File Structure

- **Create `lib/quantity.ts`** — quantity model: `parseQuantity`, `addQuantities`, `formatQuantity`, `combineItemQuantities`, `Quantity` type. Pure.
- **Create `lib/parseItemEntries.ts`** — `parseItemEntries` (split on commas, strip a leading quantity token, group + sum within the batch), `ParsedEntry` type, `extractLeadingQuantity`. Pure.
- **Create `lib/mergeItems.ts`** — `planItemMerges(entries, items)` returning add/update actions after reconciling against active existing items. Pure.
- **Modify `lib/itemName.ts`** — add `itemMatchKey(name)` (case-insensitive + single trailing-`s` plural fold).
- **Modify `hooks/useListItems.ts`** — add `addOrMergeItems(rawInput)` that executes the plan and returns the clean entry names.
- **Modify `app/list/[id]/index.tsx`** — `submitItemName` calls `addOrMergeItems` and records each returned clean name.
- **Create tests** under `lib/__tests__/`: `quantity.test.ts`, `parseItemEntries.test.ts`, `mergeItems.test.ts`, and extend `itemName` coverage via a new `itemMatchKey.test.ts`.

Run all tests with: `npx jest` (from the worktree root). Run a single file with `npx jest lib/__tests__/quantity.test.ts`.

---

## Task 1: Quantity model — parse, add, format

**Files:**
- Create: `lib/quantity.ts`
- Test: `lib/__tests__/quantity.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/quantity.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/quantity.test.ts`
Expected: FAIL — cannot find module `@/lib/quantity`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/quantity.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/quantity.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/quantity.ts lib/__tests__/quantity.test.ts
git commit -m "feat: add quantity model (parse, add, format)"
```

---

## Task 2: Combine possibly-blank quantities (blank = count 1)

**Files:**
- Modify: `lib/quantity.ts`
- Test: `lib/__tests__/quantity.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/quantity.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/quantity.test.ts -t combineItemQuantities`
Expected: FAIL — `combineItemQuantities` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/quantity.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/quantity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/quantity.ts lib/__tests__/quantity.test.ts
git commit -m "feat: combine possibly-blank quantities with blank-as-one rule"
```

---

## Task 3: Item match key (case-insensitive + plural fold)

**Files:**
- Modify: `lib/itemName.ts`
- Test: `lib/__tests__/itemMatchKey.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/itemMatchKey.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/itemMatchKey.test.ts`
Expected: FAIL — `itemMatchKey` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/itemName.ts`:

```ts
/**
 * Normalized key for deciding whether two item names are "the same thing"
 * when merging. Case-insensitive with a simple single-trailing-`s` plural
 * fold (orange = oranges). `-es` plurals (boxes, tomatoes) are not folded in
 * v1; those simply won't merge, which is acceptable.
 */
export function itemMatchKey(name: string): string {
  const base = name.trim().toLowerCase();
  if (base.length > 2 && base.endsWith('s')) {
    return base.slice(0, -1);
  }
  return base;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/itemMatchKey.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/itemName.ts lib/__tests__/itemMatchKey.test.ts
git commit -m "feat: add itemMatchKey for duplicate matching"
```

---

## Task 4: Parse comma-separated entries + batch merge

**Files:**
- Create: `lib/parseItemEntries.ts`
- Test: `lib/__tests__/parseItemEntries.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/parseItemEntries.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/parseItemEntries.test.ts`
Expected: FAIL — cannot find module `@/lib/parseItemEntries`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/parseItemEntries.ts`:

```ts
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
```

Note on the blank-merge edge: `combineItemQuantities` treats two blanks as count 2, but `parseItemEntries` only calls it when a later entry shares a key with an earlier one, so `Milk` alone stays `quantity: null` (it never combines with itself). `Milk, Milk` would yield `{ name: 'Milk', quantity: count 2 }`, which is the intended dedupe behaviour.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/parseItemEntries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/parseItemEntries.ts lib/__tests__/parseItemEntries.test.ts
git commit -m "feat: parse comma-separated entries with in-batch merging"
```

---

## Task 5: Plan merges against active existing items

**Files:**
- Create: `lib/mergeItems.ts`
- Test: `lib/__tests__/mergeItems.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/mergeItems.test.ts`:

```ts
import { planItemMerges } from '@/lib/mergeItems';
import type { ParsedEntry } from '@/lib/parseItemEntries';
import type { ListItem } from '@/lib/types';

function makeItem(overrides: Partial<ListItem>): ListItem {
  const now = new Date();
  return {
    id: 'id',
    name: '',
    quantity: null,
    description: null,
    link: null,
    checked: false,
    order: 0,
    subItems: [],
    createdBy: 'local',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const entry = (name: string, quantity: ParsedEntry['quantity']): ParsedEntry => ({
  name,
  quantity,
});

describe('planItemMerges', () => {
  it('adds a new item when nothing matches', () => {
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 5 })], []),
    ).toEqual([{ type: 'add', name: 'Oranges', quantity: '5' }]);
  });

  it('adds a new item with no quantity when the entry has none', () => {
    expect(planItemMerges([entry('Milk', null)], [])).toEqual([
      { type: 'add', name: 'Milk', quantity: null },
    ]);
  });

  it('merges into an active existing item with the same name', () => {
    const items = [makeItem({ id: 'a', name: 'Oranges', quantity: '3' })];
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 2 })], items),
    ).toEqual([{ type: 'update', id: 'a', quantity: '5' }]);
  });

  it('treats an existing blank quantity as one', () => {
    const items = [makeItem({ id: 'a', name: 'Oranges', quantity: null })];
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 2 })], items),
    ).toEqual([{ type: 'update', id: 'a', quantity: '3' }]);
  });

  it('converts units when merging into an existing item', () => {
    const items = [makeItem({ id: 'a', name: 'Chicken', quantity: '500g' })];
    expect(
      planItemMerges([entry('Chicken', { kind: 'mass', base: 1000 })], items),
    ).toEqual([{ type: 'update', id: 'a', quantity: '1.5kg' }]);
  });

  it('ignores completed items when matching', () => {
    const items = [makeItem({ id: 'a', name: 'Oranges', quantity: '3', checked: true })];
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 2 })], items),
    ).toEqual([{ type: 'add', name: 'Oranges', quantity: '2' }]);
  });

  it('adds a new item when the existing quantity is incompatible', () => {
    const items = [makeItem({ id: 'a', name: 'Oranges', quantity: '500g' })];
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 2 })], items),
    ).toEqual([{ type: 'add', name: 'Oranges', quantity: '2' }]);
  });

  it('does not merge into an item with a non-numeric quantity', () => {
    const items = [makeItem({ id: 'a', name: 'Oranges', quantity: 'a bunch' })];
    expect(
      planItemMerges([entry('Oranges', { kind: 'count', base: 2 })], items),
    ).toEqual([{ type: 'add', name: 'Oranges', quantity: '2' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/mergeItems.test.ts`
Expected: FAIL — cannot find module `@/lib/mergeItems`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/mergeItems.ts`:

```ts
import { itemMatchKey } from './itemName';
import type { ParsedEntry } from './parseItemEntries';
import {
  combineItemQuantities,
  formatQuantity,
  parseQuantity,
} from './quantity';
import type { ListItem } from './types';

export type MergeAction =
  | { type: 'add'; name: string; quantity: string | null }
  | { type: 'update'; id: string; quantity: string | null };

export function planItemMerges(
  entries: ParsedEntry[],
  items: ListItem[],
): MergeAction[] {
  const activeByKey = new Map<string, ListItem>();
  for (const item of items) {
    if (item.checked) {
      continue;
    }
    const key = itemMatchKey(item.name);
    if (!activeByKey.has(key)) {
      activeByKey.set(key, item);
    }
  }

  const actions: MergeAction[] = [];

  for (const entry of entries) {
    const key = itemMatchKey(entry.name);
    const existing = activeByKey.get(key);

    if (existing) {
      const raw = existing.quantity?.trim() ?? '';
      const existingQuantity = raw ? parseQuantity(raw) : null;
      const unparseable = raw !== '' && existingQuantity === null;

      if (!unparseable) {
        const combined = combineItemQuantities(existingQuantity, entry.quantity);
        if (combined.merged) {
          activeByKey.delete(key);
          actions.push({
            type: 'update',
            id: existing.id,
            quantity: formatQuantity(combined.quantity),
          });
          continue;
        }
      }
    }

    actions.push({
      type: 'add',
      name: entry.name,
      quantity: entry.quantity ? formatQuantity(entry.quantity) : null,
    });
  }

  return actions;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/mergeItems.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/mergeItems.ts lib/__tests__/mergeItems.test.ts
git commit -m "feat: plan merges against active existing items"
```

---

## Task 6: Wire into the add flow

**Files:**
- Modify: `hooks/useListItems.ts` (add `addOrMergeItems`, export it)
- Modify: `app/list/[id]/index.tsx` (submit calls `addOrMergeItems`, records clean names)
- Test: `npx jest` (full suite) + `npx tsc --noEmit`

- [ ] **Step 1: Add `addOrMergeItems` to the hook**

In `hooks/useListItems.ts`, add imports near the other `lib` imports (the file already imports `normalizeItemName` from `@/lib/itemName`):

```ts
import { parseItemEntries } from '@/lib/parseItemEntries';
import { planItemMerges } from '@/lib/mergeItems';
```

Then, immediately after the existing `addItem` `useCallback` (it ends around line 461 with `}, [items, listId, user]);`), add:

```ts
  const addOrMergeItems = useCallback(
    async (rawInput: string): Promise<string[]> => {
      if (!listId) {
        throw new Error('A valid list is required');
      }

      const entries = parseItemEntries(rawInput);
      if (entries.length === 0) {
        return [];
      }

      const actions = planItemMerges(entries, getPersistedItems(items));

      for (const action of actions) {
        if (action.type === 'update') {
          await updateItem(action.id, { quantity: action.quantity });
        } else {
          await addItem(action.name, { quantity: action.quantity });
        }
      }

      return entries.map((entry) => entry.name);
    },
    [addItem, items, listId, updateItem],
  );
```

- [ ] **Step 2: Export it from the hook**

In the hook's returned object (currently starts around line 699 with `return { items, loading, addItem, ... }`), add `addOrMergeItems` after `addItem`:

```ts
  return {
    items,
    loading,
    addItem,
    addOrMergeItems,
    toggleItem,
    updateItem,
    deleteItem,
    setSubItems,
    toggleSubItem,
    clearAllItems,
    reorderItems,
    applyItemLayout,
    groupDoneItemsAtBottom,
  };
```

- [ ] **Step 3: Consume it in the list screen**

In `app/list/[id]/index.tsx`, add `addOrMergeItems` to the destructured hook result (near line 91 where `addItem` is destructured):

```ts
    addItem,
    addOrMergeItems,
```

Then replace the body of `submitItemName` that currently reads:

```ts
      void addItem(nameToAdd)
        .then(() => {
          void recordName(nameToAdd);
        })
        .catch(() => {
          newItemNameRef.current = nameToAdd;
          setNewItemName(nameToAdd);
          showAppAlert('Could not add item', 'Please try again.');
        });
```

with:

```ts
      void addOrMergeItems(nameToAdd)
        .then((addedNames) => {
          for (const addedName of addedNames) {
            void recordName(addedName);
          }
        })
        .catch(() => {
          newItemNameRef.current = nameToAdd;
          setNewItemName(nameToAdd);
          showAppAlert('Could not add item', 'Please try again.');
        });
```

Then update the `useCallback` dependency array for `submitItemName` (currently `[addItem, listId, recordName, refocusAddInput]`) to:

```ts
    [addOrMergeItems, listId, recordName, refocusAddInput],
```

- [ ] **Step 4: Typecheck and run the full test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest`
Expected: PASS — all prior tests plus the new suites (no regressions in the 140-test baseline).

- [ ] **Step 5: Commit**

```bash
git add hooks/useListItems.ts "app/list/[id]/index.tsx"
git commit -m "feat: add multi-entry input with quantity parsing and merging"
```

---

## Self-Review Notes

- **Spec coverage:** multi-entry split (Task 4), quantity extraction into `quantity` (Tasks 1, 4), unit conversion (Tasks 1, 4), case+plural matching (Task 3), batch merge (Task 4), merge vs active existing items with completed excluded (Task 5), blank-as-one + incompatible-stay-separate (Tasks 2, 4, 5), immediate no-prompt apply and error restore (Task 6). All covered.
- **Deviation from spec:** `itemMatchKey` folds only a single trailing `s` (not `-es`), because the spec's stated "`-es` then `-s`" rule would map `oranges` → `orang` and break the required example. `-es` plurals simply won't fold in v1; documented in code and in the spec's known-limitations spirit.
- **Type consistency:** `Quantity`, `ParsedEntry`, `CombineResult`, `MergeAction` names and shapes are used consistently across tasks; `combineItemQuantities` returns the discriminated `CombineResult` consumed in Tasks 4 and 5.
