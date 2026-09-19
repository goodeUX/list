# Multi-entry add with quantity parsing & duplicate merging

**Date:** 2026-09-19
**Status:** Approved (design)

## Summary

Extend the list page's "add an item" input so a single submission can:

1. **Add multiple entries at once**, separated by commas.
2. **Merge duplicates** — within the typed batch *and* against existing (not-yet-completed) items on the list — summing their quantities into one item.
3. **Extract quantities** (counts, weights, volumes) out of the typed text and store them in the item's `quantity` field, leaving the item `name` clean.

Examples:

| Input | Result |
| --- | --- |
| `3 Oranges, 2 Oranges` | one item — name `Oranges`, quantity `5` |
| `250g Chicken, 250g Chicken` | one item — name `Chicken`, quantity `500g` |
| `2.5l Water, 5l Water` | one item — name `Water`, quantity `7.5l` |
| `500g Chicken, 1kg Chicken` | one item — name `Chicken`, quantity `1.5kg` |

## Decisions (from brainstorming)

- **Merge scope:** batch **and** existing list items. Adding `2 Oranges` when an active `Oranges` row exists bumps that row rather than creating a second.
- **Completed items excluded:** items with `checked === true` are ignored when looking for a duplicate to merge into. A done `Oranges` will not absorb a new `2 Oranges`.
- **Unit conversion:** compatible-but-different units convert and combine (`500g + 1kg = 1.5kg`, `500ml + 1l = 1.5l`).
- **Name matching:** case-insensitive + simple singular/plural fold (`orange` = `Oranges`). Kept row uses the first-seen (or existing item's) spelling.
- **Blank quantities:** a matched item with no quantity counts as `1` for count merges (existing blank `Oranges` + `2 Oranges` = `3 Oranges`).
- **Incompatible pairs stay separate:** count vs measurement of the same name (`2 Oranges` + `500g Oranges`), or a non-numeric quantity like `"a bunch"`, are not merged.
- **Submit UX:** parse, merge, and apply immediately — no preview/confirm step. Same one-tap flow as today.

### Confirmed consequence

A plain existing `Chicken` (blank quantity, treated as count-1) plus a typed `250g Chicken` (mass) are **incompatible dimensions**, so they remain two separate rows rather than merging.

## Scope

**In scope (v1):**

- Count (bare leading number), metric mass (`mg`, `g`, `kg`), metric volume (`ml`, `cl`, `l`).
- Comma-separated multi-entry input.
- Merge within batch + against active existing items.

**Out of scope (possible later):**

- Imperial units (`lb`, `oz`, `pint`, etc.) — v1 recognizes metric + count only, matching all the given examples.
- Quantities written as a suffix (`Chicken 250g`) — v1 only parses a **leading** quantity token.
- Fuzzy/semantic name matching beyond simple case + plural folding.

## Architecture

Parsing/merging lives in **pure, unit-tested modules**, isolated from the UI. The component and hook stay thin.

### `lib/quantity.ts` (new)

The quantity model. All pure functions.

```ts
type QuantityKind = 'count' | 'mass' | 'volume';

interface Quantity {
  kind: QuantityKind;
  base: number;   // normalized to a base unit (count=units, mass=grams, volume=millilitres)
}

parseQuantity(str: string): Quantity | null;   // null when no recognizable number
addQuantities(a: Quantity, b: Quantity): Quantity | null;  // null when kinds differ
formatQuantity(q: Quantity): string;           // "5", "500g", "1.5kg", "7.5l"
```

- Unit tables map recognized unit tokens → kind + factor to base.
  - mass: `mg` (0.001), `g` (1), `kg` (1000) → base grams.
  - volume: `ml` (1), `cl` (10), `l` (1000) → base millilitres.
  - count: bare number, base = the number.
- `formatQuantity` picks the largest unit that keeps the displayed value ≥ 1, then trims trailing `.0` (e.g. `1500g` → `1.5kg`, `500g` → `500g`, `7500ml` → `7.5l`).
- Decimals supported throughout (`2.5`, `1.5`, `7.5`).

### `lib/parseItemEntries.ts` (new)

```ts
interface ParsedEntry {
  name: string;              // display name, quantity stripped, trimmed
  quantity: Quantity | null;
}

parseItemEntries(input: string): ParsedEntry[];
```

Steps:

1. Split `input` on commas; trim; drop empties.
2. For each entry, pull a **leading** quantity token off the front:
   - `250g Chicken` → quantity `mass 250g`, name `Chicken`.
   - `3 Oranges` → quantity `count 3`, name `Oranges`.
   - `Milk` → quantity `null`, name `Milk`.
   - A leading number **not** followed by a recognized unit is a count (`2 packs sausages` → count `2`, name `packs sausages`).
3. Group entries by `itemMatchKey(name)`, summing quantities via `addQuantities`.
   - Compatible → merged into one entry (first-seen spelling kept).
   - Incompatible (kinds differ) → kept as separate entries under the same key.
4. Return the grouped entries in first-seen order.

### `lib/itemName.ts` (extend)

Add:

```ts
itemMatchKey(name: string): string;  // lowercase + trim + singular/plural fold
```

- Fold: strip a trailing `es` then `s` for matching only. Heuristic; rare words (`glasses`) may not fold — acceptable for v1. Display name is never altered by this.

### `hooks/useListItems.ts` (extend)

Add:

```ts
addOrMergeItems(rawInput: string): Promise<void>;
```

- Calls `parseItemEntries(rawInput)`.
- Builds a match map of **active** existing items (`!item.checked`) keyed by `itemMatchKey`.
- For each parsed entry:
  - If an active existing item matches **and** quantities are compatible → `updateItem(existing.id, { quantity: formatQuantity(sum) })`, where the existing item's quantity is parsed via `parseQuantity` (blank → count-1 for count merges; blank absorbed for measurement merges where compatible).
  - Otherwise → `addItem(name, { quantity })`.
- Reuses existing `addItem` / `updateItem` write paths, so cloud + local + optimistic UI behaviour is unchanged. Sequential application is fine for typical small batches.

### `app/list/[id]/index.tsx` (edit)

- `submitItemName` calls `addOrMergeItems(rawInput)` instead of `addItem(nameToAdd)`.
- Keep existing dedupe-guard, haptics, input clear/refocus, and `recordName` behaviour.
- On failure: restore the raw input text and show the existing "Could not add item" alert.

## Data flow

```
input string
  → parseItemEntries()            (split, strip quantity, group+sum within batch)
  → addOrMergeItems()             (reconcile vs active existing items)
      → updateItem() | addItem()  (existing cloud/local write paths)
  → optimistic UI + Firestore/local listener update the list
```

## Error handling

- Blank/whitespace entries after splitting are skipped.
- A write failure restores the submitted text into the input and shows "Could not add item / Please try again." (unchanged behaviour).
- Names are still clamped to `ITEM_NAME_MAX_LENGTH` via the existing `normalizeItemName` in the add path.

## Testing (TDD)

Pure functions get thorough unit tests in `lib/__tests__/`:

- **`quantity.test.ts`** — `parseQuantity` (counts, mass, volume, decimals, unknown units, blanks), `addQuantities` (same unit, cross-unit conversion, incompatible → null), `formatQuantity` (unit promotion, `.0` trimming).
- **`parseItemEntries.test.ts`** — the three headline examples, cross-unit example, plural matching, blank handling, incompatible-stays-separate, multi-entry ordering, empty-entry skipping.

Component/hook wiring kept minimal; logic is covered at the pure-function level.
