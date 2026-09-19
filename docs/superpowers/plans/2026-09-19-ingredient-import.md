# Ingredient Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user share a recipe URL to List Kitty on Android and either add the page as a link item or import its ingredients (extracted from schema.org structured data, no AI) into a chosen list, reusing the `bulk-entry` quantity parser and merge engine.

**Architecture:** All HTML/ingredient parsing is pure and unit-tested (`lib/recipeImport.ts`). A thin impure layer fetches pages (`lib/recipeFetch.ts`) and applies parsed entries to any list (`lib/importEntries.ts`, decoupled from the screen-bound `useListItems`). Android receives shares via the `expo-share-intent` config plugin (dev build only); a new `app/import/index.tsx` screen drives the choice, fetch, fallback, and list selection.

**Tech Stack:** TypeScript, React Native / Expo SDK 57, expo-router, Firestore + local store, Jest (jest-expo), expo-share-intent.

---

## File Structure

- **Create `lib/recipeImport.ts`** — pure parsing: `extractSharedUrl`, `parseRecipeFromHtml`, `parsePageTitleFromHtml`, `ingredientToEntry`, plus text-normalization helpers. Depends on `extractLeadingQuantity` from `lib/parseItemEntries.ts`.
- **Create `lib/recipeFetch.ts`** — impure: `fetchAndParseRecipe`, `fetchPageTitle` (uses `fetch`).
- **Create `lib/importEntries.ts`** — impure: `applyEntriesToList(listId, user, entries)` (cloud + local writes), decoupled from the hook.
- **Modify `lib/parseItemEntries.ts`** — extract `export function mergeEntries(entries)`; `parseItemEntries` calls it.
- **Modify `app.config.js`** — add the `expo-share-intent` plugin (Android share target).
- **Modify `app/_layout.tsx`** — subscribe to `useShareIntent()`, route to the import screen.
- **Create `app/import/index.tsx`** — the import screen (choice, fetch, fallback, list pick).
- **Tests** under `lib/__tests__/`: `recipeImport.test.ts`, `recipeFetch.test.ts`, and an extension to `parseItemEntries.test.ts`.

Test commands: `npx jest <path>` for one file, `npx jest` for all, `npx tsc --noEmit` for types.

---

## Task 1: extractSharedUrl

**Files:**
- Create: `lib/recipeImport.ts`
- Test: `lib/__tests__/recipeImport.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/recipeImport.test.ts`:

```ts
import { extractSharedUrl } from '@/lib/recipeImport';

describe('extractSharedUrl', () => {
  it('returns a bare URL', () => {
    expect(extractSharedUrl('https://example.com/recipe')).toBe(
      'https://example.com/recipe',
    );
  });

  it('pulls the URL out of shared "title + link" text', () => {
    expect(
      extractSharedUrl('Best Pancakes https://example.com/pancakes'),
    ).toBe('https://example.com/pancakes');
  });

  it('trims trailing punctuation/whitespace', () => {
    expect(extractSharedUrl('see https://example.com/x).')).toBe(
      'https://example.com/x',
    );
  });

  it('returns null when there is no URL', () => {
    expect(extractSharedUrl('just some text')).toBeNull();
    expect(extractSharedUrl('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/recipeImport.test.ts`
Expected: FAIL — cannot find module `@/lib/recipeImport`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/recipeImport.ts`:

```ts
import { extractLeadingQuantity, type ParsedEntry } from './parseItemEntries';

export interface ParsedRecipe {
  title: string | null;
  ingredients: string[];
}

export function extractSharedUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  if (!match) {
    return null;
  }
  // Drop trailing punctuation that commonly rides along in shared text.
  return match[0].replace(/[.,)\]}>'"]+$/, '');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/recipeImport.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/recipeImport.ts lib/__tests__/recipeImport.test.ts
git commit -m "feat: extract a shared URL from share-sheet text"
```

---

## Task 2: parseRecipeFromHtml + parsePageTitleFromHtml

**Files:**
- Modify: `lib/recipeImport.ts`
- Test: `lib/__tests__/recipeImport.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/recipeImport.test.ts`:

```ts
import { parseRecipeFromHtml, parsePageTitleFromHtml } from '@/lib/recipeImport';

const jsonLdRecipe = `
<html><head>
<title>Pancakes - Example</title>
<meta property="og:title" content="Fluffy Pancakes">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Recipe","name":"Fluffy Pancakes",
"recipeIngredient":["2 cups flour, sifted","1 tbsp sugar","1/2 tsp salt"]}
</script>
</head><body></body></html>`;

const graphRecipe = `
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
 {"@type":"WebPage","name":"Page"},
 {"@type":["Recipe","Thing"],"name":"Graph Cake","recipeIngredient":["3 eggs","200g sugar"]}
]}
</script>`;

const microdataRecipe = `
<div itemscope itemtype="https://schema.org/Recipe">
  <h1 itemprop="name">Micro Soup</h1>
  <li itemprop="recipeIngredient">1 onion</li>
  <li itemprop="recipeIngredient">2 cups stock</li>
</div>`;

describe('parseRecipeFromHtml', () => {
  it('reads ingredients and name from JSON-LD', () => {
    expect(parseRecipeFromHtml(jsonLdRecipe)).toEqual({
      title: 'Fluffy Pancakes',
      ingredients: ['2 cups flour, sifted', '1 tbsp sugar', '1/2 tsp salt'],
    });
  });

  it('finds a Recipe inside @graph and array @type', () => {
    expect(parseRecipeFromHtml(graphRecipe)).toEqual({
      title: 'Graph Cake',
      ingredients: ['3 eggs', '200g sugar'],
    });
  });

  it('falls back to microdata', () => {
    expect(parseRecipeFromHtml(microdataRecipe)).toEqual({
      title: 'Micro Soup',
      ingredients: ['1 onion', '2 cups stock'],
    });
  });

  it('returns empty ingredients when there is no recipe', () => {
    expect(parseRecipeFromHtml('<html><body>no recipe</body></html>')).toEqual({
      title: null,
      ingredients: [],
    });
  });
});

describe('parsePageTitleFromHtml', () => {
  it('prefers og:title', () => {
    expect(parsePageTitleFromHtml(jsonLdRecipe)).toBe('Fluffy Pancakes');
  });

  it('falls back to <title>', () => {
    expect(parsePageTitleFromHtml('<title>Just Title</title>')).toBe('Just Title');
  });

  it('returns null when nothing is present', () => {
    expect(parsePageTitleFromHtml('<html><body>x</body></html>')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/recipeImport.test.ts`
Expected: FAIL — `parseRecipeFromHtml` / `parsePageTitleFromHtml` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/recipeImport.ts`:

```ts
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&frac12;/g, '1/2')
    .replace(/&frac14;/g, '1/4')
    .replace(/&frac34;/g, '3/4')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

function cleanText(text: string): string {
  return decodeEntities(stripHtml(text)).replace(/\s+/g, ' ').trim();
}

function extractJsonLdNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const visit = (node: unknown) => {
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (node && typeof node === 'object') {
        const obj = node as Record<string, unknown>;
        nodes.push(obj);
        if (Array.isArray(obj['@graph'])) {
          obj['@graph'].forEach(visit);
        }
      }
    };
    visit(parsed);
  }

  return nodes;
}

function isRecipeType(type: unknown): boolean {
  if (typeof type === 'string') {
    return type.toLowerCase() === 'recipe';
  }
  if (Array.isArray(type)) {
    return type.some(
      (entry) => typeof entry === 'string' && entry.toLowerCase() === 'recipe',
    );
  }
  return false;
}

function toIngredientList(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => cleanText(entry))
    .filter((entry) => entry.length > 0);
}

function parseRecipeFromMicrodata(html: string): ParsedRecipe {
  const ingredients: string[] = [];
  const regex =
    /itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\//gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const text = cleanText(match[1]);
    if (text) {
      ingredients.push(text);
    }
  }

  let title: string | null = null;
  const nameMatch = html.match(/itemprop=["']name["'][^>]*>([\s\S]*?)<\//i);
  if (nameMatch) {
    title = cleanText(nameMatch[1]) || null;
  }

  return { title, ingredients };
}

export function parseRecipeFromHtml(html: string): ParsedRecipe {
  for (const node of extractJsonLdNodes(html)) {
    if (isRecipeType(node['@type'])) {
      const ingredients = toIngredientList(node['recipeIngredient']);
      const name = typeof node['name'] === 'string' ? cleanText(node['name'] as string) : '';
      return { title: name || null, ingredients };
    }
  }

  return parseRecipeFromMicrodata(html);
}

export function parsePageTitleFromHtml(html: string): string | null {
  const og = html.match(
    /<meta[^>]+(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i,
  );
  if (og) {
    return cleanText(og[1]) || null;
  }

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) {
    return cleanText(title[1]) || null;
  }

  for (const node of extractJsonLdNodes(html)) {
    if (typeof node['name'] === 'string') {
      const name = cleanText(node['name'] as string);
      if (name) {
        return name;
      }
    }
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/recipeImport.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/recipeImport.ts lib/__tests__/recipeImport.test.ts
git commit -m "feat: parse recipe ingredients and page title from HTML"
```

---

## Task 3: ingredientToEntry (quantity + prep-note trim + vulgar fractions)

**Files:**
- Modify: `lib/recipeImport.ts`
- Test: `lib/__tests__/recipeImport.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/recipeImport.test.ts`:

```ts
import { ingredientToEntry } from '@/lib/recipeImport';

describe('ingredientToEntry', () => {
  it('splits quantity from name and trims prep notes after a comma', () => {
    expect(ingredientToEntry('2 cups flour, sifted')).toEqual({
      name: 'flour',
      quantity: { kind: 'cup', base: 2 },
    });
    expect(ingredientToEntry('1 onion, finely chopped')).toEqual({
      name: 'onion',
      quantity: { kind: 'count', base: 1 },
    });
  });

  it('handles ASCII fractions and cooking units', () => {
    expect(ingredientToEntry('1/2 tsp salt')).toEqual({
      name: 'salt',
      quantity: { kind: 'tsp', base: 0.5 },
    });
  });

  it('normalizes unicode vulgar fractions', () => {
    expect(ingredientToEntry('½ tsp vanilla')).toEqual({
      name: 'vanilla',
      quantity: { kind: 'tsp', base: 0.5 },
    });
    expect(ingredientToEntry('1½ cups milk')).toEqual({
      name: 'milk',
      quantity: { kind: 'cup', base: 1.5 },
    });
  });

  it('keeps a name with no quantity', () => {
    expect(ingredientToEntry('salt and pepper to taste')).toEqual({
      name: 'salt and pepper to taste',
      quantity: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/recipeImport.test.ts -t ingredientToEntry`
Expected: FAIL — `ingredientToEntry` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/recipeImport.ts`:

```ts
const VULGAR_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};

function normalizeVulgarFractions(text: string): string {
  let out = '';
  for (const char of text) {
    const replacement = VULGAR_FRACTIONS[char];
    if (replacement) {
      // "1½" -> "1 1/2" so it reads as a mixed number.
      if (out.length > 0 && /\d/.test(out[out.length - 1])) {
        out += ' ';
      }
      out += replacement;
    } else {
      out += char;
    }
  }
  return out;
}

export function ingredientToEntry(line: string): ParsedEntry {
  const normalized = normalizeVulgarFractions(cleanText(line));
  const { name, quantity } = extractLeadingQuantity(normalized);
  const trimmedName = name.split(',')[0].trim();
  return { name: trimmedName, quantity };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/recipeImport.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/recipeImport.ts lib/__tests__/recipeImport.test.ts
git commit -m "feat: convert a recipe ingredient line to a parsed entry"
```

---

## Task 4: mergeEntries refactor

**Files:**
- Modify: `lib/parseItemEntries.ts`
- Test: `lib/__tests__/parseItemEntries.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/parseItemEntries.test.ts`:

```ts
import { mergeEntries } from '@/lib/parseItemEntries';

describe('mergeEntries', () => {
  it('combines compatible duplicates and drops nameless entries', () => {
    expect(
      mergeEntries([
        { name: 'Flour', quantity: { kind: 'cup', base: 0.75 } },
        { name: '', quantity: null },
        { name: 'flour', quantity: { kind: 'cup', base: 0.25 } },
      ]),
    ).toEqual([{ name: 'Flour', quantity: { kind: 'cup', base: 1 } }]);
  });

  it('keeps incompatible same-name entries separate', () => {
    expect(
      mergeEntries([
        { name: 'Oranges', quantity: { kind: 'count', base: 2 } },
        { name: 'Oranges', quantity: { kind: 'mass', base: 500 } },
      ]),
    ).toEqual([
      { name: 'Oranges', quantity: { kind: 'count', base: 2 } },
      { name: 'Oranges', quantity: { kind: 'mass', base: 500 } },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/parseItemEntries.test.ts -t mergeEntries`
Expected: FAIL — `mergeEntries` not exported.

- [ ] **Step 3: Refactor `parseItemEntries` to expose `mergeEntries`**

In `lib/parseItemEntries.ts`, replace the current `parseItemEntries` function with a `mergeEntries` function plus a thin `parseItemEntries` wrapper. The `tryMergeInto` helper stays as-is above these.

```ts
export function mergeEntries(entries: ParsedEntry[]): ParsedEntry[] {
  const order: string[] = [];
  const groups = new Map<string, ParsedEntry[]>();

  for (const parsed of entries) {
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

export function parseItemEntries(input: string): ParsedEntry[] {
  return mergeEntries(input.split(',').map(extractLeadingQuantity));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest lib/__tests__/parseItemEntries.test.ts`
Expected: PASS — the new `mergeEntries` tests plus all existing `parseItemEntries` tests (behavior unchanged).

- [ ] **Step 5: Commit**

```bash
git add lib/parseItemEntries.ts lib/__tests__/parseItemEntries.test.ts
git commit -m "refactor: expose mergeEntries for reuse by import"
```

---

## Task 5: applyEntriesToList (standalone writer)

**Files:**
- Create: `lib/importEntries.ts`
- Test: none automated (integration with Firestore/local store — verified via the import screen in a dev build). Typecheck only.

- [ ] **Step 1: Write the implementation**

Create `lib/importEntries.ts`:

```ts
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { db } from '@/lib/firebase';
import { addItemToList } from '@/hooks/useListItems';
import { normalizeItemName } from '@/lib/itemName';
import { nextItemOrder } from '@/lib/listItemOrdering';
import { usesCloudListData } from '@/lib/listIds';
import { getLocalItems, updateLocalItem } from '@/lib/localStore';
import { planItemMerges } from '@/lib/mergeItems';
import { mergeEntries } from '@/lib/parseItemEntries';
import type { ParsedEntry } from '@/lib/parseItemEntries';
import type { ListItem } from '@/lib/types';

async function readListItems(listId: string, user: User | null): Promise<ListItem[]> {
  if (!usesCloudListData(user, listId)) {
    return getLocalItems(listId);
  }
  const snapshot = await getDocs(
    query(collection(db, 'lists', listId, 'items'), orderBy('order')),
  );
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: (data.name as string) ?? '',
      quantity: (data.quantity as string | null) ?? null,
      description: (data.description as string | null) ?? null,
      link: (data.link as string | null) ?? null,
      checked: (data.checked as boolean) ?? false,
      order: (data.order as number) ?? 0,
      subItems: [],
      createdBy: (data.createdBy as string) ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

/**
 * Merge parsed entries into a list that may not be the one currently on screen.
 * Combines duplicates, sums into matching active items, and writes through the
 * same cloud/local paths used elsewhere. Returns the normalized entry names.
 */
export async function applyEntriesToList(
  listId: string,
  user: User | null,
  rawEntries: ParsedEntry[],
): Promise<string[]> {
  const entries = mergeEntries(rawEntries);
  if (entries.length === 0) {
    return [];
  }

  const existing = (await readListItems(listId, user)).filter(
    (item) => !item.id.startsWith('optimistic:'),
  );
  const actions = planItemMerges(entries, existing);

  const base = nextItemOrder(existing);
  const addCount = actions.filter((action) => action.type === 'add').length;
  let addIndex = 0;

  for (const action of actions) {
    if (action.type === 'update') {
      if (!usesCloudListData(user, listId)) {
        await updateLocalItem(listId, action.id, { quantity: action.quantity });
      } else {
        await updateDoc(doc(db, 'lists', listId, 'items', action.id), {
          quantity: action.quantity,
          updatedAt: serverTimestamp(),
        });
      }
      continue;
    }

    const order = base - (addCount - 1 - addIndex);
    addIndex += 1;
    await addItemToList(
      listId,
      user,
      action.name,
      { quantity: action.quantity },
      existing,
      order,
    );
  }

  if (usesCloudListData(user, listId)) {
    await updateDoc(doc(db, 'lists', listId), { updatedAt: serverTimestamp() });
  }

  return entries.map((entry) => normalizeItemName(entry.name));
}
```

Note: this mirrors the batch-order arithmetic from `addOrMergeItems` (`order = base - (addCount - 1 - i)`), so imported items keep recipe order top→bottom. `addItemToList` and `nextItemOrder` are already exported from their modules; if `nextItemOrder` needs the empty-list probe, `addItemToList` handles it when `existing` is empty and no explicit order is passed — here we always pass an order, and `base` is 0 for an empty list, which is correct for a first import.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (exit 0). Fix any import path or signature mismatches (confirm `addItemToList`'s parameter order matches: `(listId, user, name, fields, existingItems, explicitOrder?)`).

- [ ] **Step 3: Commit**

```bash
git add lib/importEntries.ts
git commit -m "feat: apply parsed entries to a chosen list"
```

---

## Task 6: recipeFetch (fetch wrapper)

**Files:**
- Create: `lib/recipeFetch.ts`
- Test: `lib/__tests__/recipeFetch.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/recipeFetch.test.ts`:

```ts
import { fetchAndParseRecipe } from '@/lib/recipeFetch';

describe('fetchAndParseRecipe', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches HTML and returns parsed ingredients', async () => {
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":"T","recipeIngredient":["1 egg"]}</script>`;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    }) as unknown as typeof fetch;

    await expect(fetchAndParseRecipe('https://example.com/r')).resolves.toEqual({
      title: 'T',
      ingredients: ['1 egg'],
    });
  });

  it('throws on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(''),
    }) as unknown as typeof fetch;

    await expect(fetchAndParseRecipe('https://example.com/missing')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/recipeFetch.test.ts`
Expected: FAIL — cannot find module `@/lib/recipeFetch`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/recipeFetch.ts`:

```ts
import {
  parsePageTitleFromHtml,
  parseRecipeFromHtml,
  type ParsedRecipe,
} from '@/lib/recipeImport';

const FETCH_TIMEOUT_MS = 12000;
// A desktop-browser UA reduces bot blocking on some recipe sites.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAndParseRecipe(url: string): Promise<ParsedRecipe> {
  return parseRecipeFromHtml(await fetchHtml(url));
}

export async function fetchPageTitle(url: string): Promise<string | null> {
  return parsePageTitleFromHtml(await fetchHtml(url));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/recipeFetch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/recipeFetch.ts lib/__tests__/recipeFetch.test.ts
git commit -m "feat: fetch and parse a recipe page"
```

---

## Task 7: Android share target (expo-share-intent)

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `app.config.js` (add plugin)
- Modify: `app/_layout.tsx` (subscribe + route)
- Test: manual, in a dev build (not unit-testable).

- [ ] **Step 1: Verify SDK 57 compatibility and install**

Check the `expo-share-intent` README/changelog for the version supporting Expo SDK 57 (per AGENTS.md, confirm against the exact versioned docs before wiring). Then:

Run: `npx expo install expo-share-intent`
Expected: adds `expo-share-intent` to `package.json` dependencies.

If the current release does not support SDK 57, STOP and report — do not force an incompatible native module.

- [ ] **Step 2: Add the config plugin**

In `app.config.js`, add the plugin to the `expo.plugins` array (after the existing google-signin entry):

```js
  expo.plugins = [
    ...(expo.plugins ?? []),
    googleIosUrlScheme
      ? ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]
      : '@react-native-google-signin/google-signin',
    [
      'expo-share-intent',
      {
        // Android only for v1: receive shared URLs/text.
        androidIntentFilters: ['text/plain'],
      },
    ],
  ];
```

Confirm the exact option keys against the installed version's docs; adjust if the plugin uses different keys.

- [ ] **Step 3: Subscribe and route in the root layout**

In `app/_layout.tsx`, import the hook and add an effect inside the root component that, on a new share intent, extracts the URL and navigates to the import screen:

```tsx
import { useShareIntent } from 'expo-share-intent';
import { router } from 'expo-router';
import { extractSharedUrl } from '@/lib/recipeImport';
// ...
const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

useEffect(() => {
  if (!hasShareIntent) {
    return;
  }
  const shared = shareIntent.webUrl ?? shareIntent.text ?? '';
  const url = extractSharedUrl(shared);
  resetShareIntent();
  if (url) {
    router.push({ pathname: '/import', params: { url } });
  }
}, [hasShareIntent, shareIntent, resetShareIntent]);
```

Place this after auth/session context is available so routing lands correctly; if the user is signed out, the existing auth gate will redirect to sign-in, and the `/import` route re-renders once authenticated (the `url` param persists in the navigation state).

- [ ] **Step 4: Build and verify manually (dev build)**

Run: `npx expo run:android`
Then, on the device: open a recipe page in Chrome → Share → List Kitty. Confirm the app opens and navigates to a screen showing the shared URL (the screen itself is Task 8; for now a placeholder or log confirms receipt). Report what happened.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.config.js "app/_layout.tsx"
git commit -m "feat: receive shared URLs as an Android share target"
```

---

## Task 8: Import screen (choice, fetch, fallback, list pick)

**Files:**
- Create: `app/import/index.tsx`
- Test: manual, in a dev build.

- [ ] **Step 1: Build the screen**

Create `app/import/index.tsx`. It reads the `url` param and drives the flow. Reuse the existing `ChooseEditableListsModal` (list pick) and `ListFormModal` (create new), `applyEntriesToList`, `fetchAndParseRecipe`, `fetchPageTitle`, and `ingredientToEntry`. Follow the styling/theming patterns of the existing screens (e.g. `app/list/[id]/share.tsx`).

State machine:
1. `choosing` — show the URL and two buttons: "Add page as item" and "Import ingredients".
2. On "Import ingredients": set `loading`, call `fetchAndParseRecipe(url)`.
   - ingredients found → keep them, go to `pickList` (action = ingredients).
   - none found or fetch error → go to `fallbackOffer` ("No ingredients found — add the page as a link instead?").
3. On "Add page as item" (or accepting the fallback): set `loading`, call `fetchPageTitle(url)` (default to the URL host if null), go to `pickList` (action = link).
4. `pickList` — show `ChooseEditableListsModal` + a "New list" button (opens `ListFormModal`). On selection, run the apply:
   - ingredients: `applyEntriesToList(listId, user, ingredients.map(ingredientToEntry))`.
   - link: `addItemToList(listId, user, title, { link: url }, [] )` (single item; order defaults).
5. On success: `router.replace('/list/' + listId)` and show a summary toast/alert ("Added N ingredients" / "Added link").
6. On error at any fetch step: show a message with Retry and the add-as-link fallback.

Use the app's existing alert/toast helper (`showAppAlert`) for messages, and the existing auth context (`useAuth`) for `user`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Verify manually (dev build)**

Run: `npx expo run:android` (or reload if already running).
Test all paths on-device:
- Share a JSON-LD recipe URL → Import ingredients → pick a list → items appear with quantities in recipe order; duplicates merged.
- Share the same recipe into a list that already has one of the ingredients → quantity sums.
- Share a non-recipe page → Import ingredients → offered add-as-link → accept → link item added.
- Share any page → Add page as item → item added with the page title and the URL in its link field.
Report results per path.

- [ ] **Step 4: Commit**

```bash
git add "app/import/index.tsx"
git commit -m "feat: import screen for adding a page or recipe ingredients"
```

---

## Self-Review Notes

- **Spec coverage:** share receipt (Task 7), choice screen (Task 8), add-page-as-link with title + link field (Tasks 6, 8), import ingredients (Tasks 2, 3, 6, 8), JSON-LD + microdata extraction (Task 2), prep-note trim + fractions/cooking units (Task 3), reuse of merge engine (Tasks 4, 5), no-data fallback (Task 8), pick/create list (Task 8). All covered.
- **Refinement vs spec:** apply logic is a standalone `lib/importEntries.ts` (`applyEntriesToList`) rather than a `useListItems` method, because the target list is usually not the one on screen and the hook is bound to a single list. `mergeEntries` reuse is unchanged from the spec.
- **Additions beyond the spec, kept in scope:** unicode vulgar-fraction normalization (½ → 1/2, 1½ → 1 1/2) and HTML entity/tag cleaning in ingredient text — necessary for real recipe pages; folded into Task 3 / Task 2.
- **Non-testable work is explicit:** Tasks 7 and 8 are verified manually in an Android dev build (share intents, native module, and screens can't run under jest-expo). Tasks 1-6 are fully unit-tested or typechecked.
- **Type consistency:** `ParsedRecipe`, `ParsedEntry`, `MergeAction` names/shapes are consistent across tasks; `applyEntriesToList` consumes `mergeEntries` + `planItemMerges` and writes via `addItemToList` with the `(…, existingItems, explicitOrder?)` signature added on the `bulk-entry` branch.
