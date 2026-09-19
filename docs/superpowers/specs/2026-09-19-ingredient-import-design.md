# Ingredient import from a shared recipe URL

**Date:** 2026-09-19
**Status:** Approved (design)

## Summary

Let a user share a web page to List Kitty from the Android share sheet and either:

1. **Add the page as a link item** (reading-list style) — a single list item whose name is the page title and whose `link` field holds the URL, or
2. **Import ingredients** — extract the recipe's ingredients (name + quantity) and add each as a list item in a chosen list.

Ingredient extraction uses **structured recipe metadata (schema.org `Recipe`), not AI** — deterministic, free, offline of any model. Each ingredient line is run through the existing quantity parser and merge engine built on the `bulk-entry` branch.

## Decisions (from brainstorming)

- **Platform:** Android first (single `ACTION_SEND` / `text/plain` share-target intent filter). iOS Share Extension deferred (and blocked on the invalid iOS bundle id).
- **Extraction source:** schema.org **JSON-LD `Recipe`** primary; **microdata** (`itemprop="recipeIngredient"`) as a cheap secondary. No fragile HTML-pattern guessing, no AI.
- **No-data fallback:** if no ingredients can be read, tell the user and offer to add the page as a single link item instead.
- **Ingredient names:** pull out the leading quantity, then **trim trailing prep notes after a comma** (`2 cups flour, sifted` → name `flour`, qty `2cups`; `1 onion, finely chopped` → `onion` ×1).
- **Merge on import:** reuse the `bulk-entry` engine — combine duplicates within the recipe and sum into matching active items in the target list, with unit conversion.
- **Free-plan caps:** out of scope for v1 (imports do not check list/item caps).

## Flow

```
Android share sheet ─(ACTION_SEND, text/plain)→ List Kitty opens
  → Import screen (shows the shared URL)
     → choose: "Add page as item"  |  "Import ingredients"
        ├─ Add page as item → fetch page title → pick/create list → add 1 item {name: title, link: url}
        └─ Import ingredients → fetch + parse recipe
              ├─ ingredients found → pick/create list → parse each line → merge → add items
              └─ none found → offer "add as link instead" → pick/create list → add link item
  → open the chosen list + summary toast ("Added N ingredients")
```

Fetching is lazy per action (only when needed). For the ingredients path, fetch/parse happens **before** the list picker so the no-data fallback can be offered first.

## Architecture

Parsing is pure and unit-tested; only fetching and the screens are impure.

### `lib/recipeImport.ts` (new, pure parsing)

```ts
export interface ParsedRecipe {
  title: string | null;
  ingredients: string[]; // raw recipeIngredient lines
}

extractSharedUrl(text: string): string | null;       // first http(s) URL in shared text
parseRecipeFromHtml(html: string): ParsedRecipe;      // JSON-LD Recipe, then microdata
parsePageTitleFromHtml(html: string): string | null;  // og:title -> <title> -> JSON-LD name
ingredientToEntry(line: string): ParsedEntry;         // extractLeadingQuantity + trim prep notes
```

- `parseRecipeFromHtml`:
  1. Find every `<script type="application/ld+json">` block, `JSON.parse` each (tolerant of arrays and `@graph`), locate an object whose `@type` is `Recipe` (or includes it), read `recipeIngredient` (array of strings) and `name`.
  2. If none, scan for microdata `itemprop="recipeIngredient"` element text.
  3. Return `{ title, ingredients }`; `ingredients: []` when nothing is found.
- `ingredientToEntry`: `extractLeadingQuantity(line)` (from `lib/parseItemEntries.ts`) to split quantity from name, then strip everything from the first comma onward in the name and re-trim. Empty result names are dropped by the caller.

### `lib/recipeFetch.ts` (new, impure wrapper)

```ts
fetchAndParseRecipe(url: string): Promise<ParsedRecipe>;  // fetch + parseRecipeFromHtml
fetchPageTitle(url: string): Promise<string | null>;      // fetch + parsePageTitleFromHtml
```

- Uses global `fetch` (React Native native fetch has no CORS restriction).
- Sends a browser-like `User-Agent` header to reduce bot blocking.
- Applies a timeout (via `AbortController`); throws a typed error on network/timeout/HTTP failure so the screen can show a retry/fallback.

### Reuse refactor (small, in existing files)

- `lib/parseItemEntries.ts`: extract the in-batch grouping into `export function mergeEntries(entries: ParsedEntry[]): ParsedEntry[]`; `parseItemEntries` calls it after tokenizing (behavior unchanged, covered by existing tests).
- `hooks/useListItems.ts`: extract the apply-actions loop of `addOrMergeItems` into a shared helper so both typed multi-entry and import share it. Add:

```ts
addOrMergeEntries(entries: ParsedEntry[], targetListId?: string): Promise<string[]>;
```

  Import path: `ingredientToEntry` per line → `mergeEntries` → `planItemMerges(entries, targetItems)` → apply add/update through the existing `addItem`/`updateItem` write paths (cloud + local), returning normalized names. When importing into a list other than the currently-open one, the target list's items are read for the merge (a one-off `getDocs`/local read) rather than the in-memory `items`.

### Native / config (`app.config.js`)

- Add the **`expo-share-intent`** config plugin (verified against Expo SDK 57 first) to register the Android `ACTION_SEND` `text/plain` intent filter and expose `useShareIntent()`.
- Requires a **dev build** (`npx expo run:android`); not available in Expo Go.

### Routing / screens

- `app/_layout.tsx`: subscribe to `useShareIntent()`. On a new shared text, `extractSharedUrl` and navigate to `app/import/index.tsx?url=…`. If unauthenticated, route to sign-in first and resume with the stashed URL afterward.
- `app/import/index.tsx` (new): shows the URL and the two action buttons; drives fetch, the no-data fallback, and list selection via the existing **`ChooseEditableListsModal`** (pick) and **`ListFormModal`** (create new). On completion, navigates to the chosen list and shows a summary toast.

## Data flow (ingredients)

```
shared text
  → extractSharedUrl()
  → fetchAndParseRecipe(url)            (impure)
      → parseRecipeFromHtml(html)       (pure: JSON-LD → microdata)
  → ingredients.map(ingredientToEntry)  (pure: quantity + prep-note trim)
  → mergeEntries()                      (pure: dedupe within recipe)
  → planItemMerges(entries, listItems)  (pure, existing/tested)
  → addItem / updateItem                (existing cloud + local write paths)
```

## Error handling

- Shared text with no URL → "That doesn't look like a link" message.
- Fetch/timeout/HTTP error → error with retry, plus the add-as-link fallback.
- Recipe page with no readable ingredients → offer add-as-link.
- Empty ingredient names after trimming are skipped.
- Free-plan caps intentionally not enforced in v1.

## Scope

**In scope (v1):**
- Android share-target receiving a URL.
- Add-page-as-link and import-ingredients paths.
- JSON-LD + microdata extraction; page-title extraction.
- Reuse of quantity parsing + merge engine; pick or create target list.

**Out of scope (later):**
- iOS Share Extension.
- Free-plan cap enforcement during import.
- JavaScript-rendered (SPA) recipe pages whose ingredients aren't in the initial HTML.
- Heuristic/site-specific HTML scraping beyond schema.org structured data.

## Testing

Pure functions get fixture-based unit tests in `lib/__tests__/`:
- `recipeImport.test.ts`: `parseRecipeFromHtml` (JSON-LD single, JSON-LD `@graph`/array, microdata, none), `parsePageTitleFromHtml` (og:title / `<title>` / JSON-LD name), `extractSharedUrl` (bare URL, "title + URL", no URL), `ingredientToEntry` (prep-note trim, leading quantity, fraction/cooking units via the shared parser).
- `mergeEntries` covered via existing/extended `parseItemEntries` tests.
- Native share receipt, fetching, and the import screen are verified manually in a dev build.
