export interface ListHistoryEntry {
  name: string;
  useCount: number;
  lastUsedAt: Date;
}

export interface SuggestionListItem {
  id: string;
  name: string;
  checked: boolean;
}

export interface ItemSuggestion {
  name: string;
  /** Start of the matched run within `name`, for highlighting. */
  matchStart: number;
  /** Length of the matched run within `name`. */
  matchLength: number;
  /** Set when the name is already on the list and checked: tapping unchecks it. */
  checkedItemId: string | null;
}

/** Highest number of matches handed to the panel, however many rows it shows. */
export const MAX_ITEM_SUGGESTIONS = 20;

/** Rows the panel shows before it starts scrolling. */
export const SUGGESTION_ROWS_VISIBLE = 5;

const WORD_SEPARATOR = /[\s-]/;

/**
 * Case- and accent-folds a name, keeping a map from each folded character back
 * to its index in the original string so matches can be highlighted.
 */
function fold(value: string): { text: string; indices: number[] } {
  let text = '';
  const indices: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const folded = value[index]
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();

    for (const character of folded) {
      text += character;
      indices.push(index);
    }
  }

  return { text, indices };
}

export function foldItemName(value: string): string {
  return fold(value.trim()).text;
}

function matchStartInFolded(text: string, query: string): number | null {
  if (text.startsWith(query)) {
    return 0;
  }

  for (let index = 1; index < text.length; index += 1) {
    if (WORD_SEPARATOR.test(text[index - 1]) && text.startsWith(query, index)) {
      return index;
    }
  }

  return null;
}

/**
 * Orders history entries by how worth keeping they are, most useful first.
 * Used when a list history passes its size cap.
 */
export function compareHistoryUsefulness(
  a: ListHistoryEntry,
  b: ListHistoryEntry,
): number {
  if (a.useCount !== b.useCount) {
    return b.useCount - a.useCount;
  }

  return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
}

interface RankedSuggestion extends ItemSuggestion {
  foldedName: string;
  lastUsedAt: Date;
  startsName: boolean;
  useCount: number;
}

function compareRanked(a: RankedSuggestion, b: RankedSuggestion): number {
  if (a.startsName !== b.startsName) {
    return a.startsName ? -1 : 1;
  }

  if (a.useCount !== b.useCount) {
    return b.useCount - a.useCount;
  }

  const recency = b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
  if (recency !== 0) {
    return recency;
  }

  return a.foldedName < b.foldedName ? -1 : a.foldedName > b.foldedName ? 1 : 0;
}

export function getItemSuggestions(
  query: string,
  history: ListHistoryEntry[],
  items: SuggestionListItem[],
): ItemSuggestion[] {
  const foldedQuery = foldItemName(query);
  if (!foldedQuery) {
    return [];
  }

  const itemsByFoldedName = new Map<string, SuggestionListItem>();
  for (const item of items) {
    const key = foldItemName(item.name);
    // An unchecked copy hides the suggestion outright, so it wins over a
    // checked duplicate of the same name.
    const existing = itemsByFoldedName.get(key);
    if (!existing || (existing.checked && !item.checked)) {
      itemsByFoldedName.set(key, item);
    }
  }

  const ranked: RankedSuggestion[] = [];

  for (const historyEntry of history) {
    const { text, indices } = fold(historyEntry.name);
    const start = matchStartInFolded(text, foldedQuery);
    if (start === null) {
      continue;
    }

    const onList = itemsByFoldedName.get(text);
    if (onList && !onList.checked) {
      continue;
    }

    const matchStart = indices[start];
    const matchEnd = indices[start + foldedQuery.length - 1] + 1;

    ranked.push({
      checkedItemId: onList?.id ?? null,
      foldedName: text,
      lastUsedAt: historyEntry.lastUsedAt,
      matchLength: matchEnd - matchStart,
      matchStart,
      name: historyEntry.name,
      startsName: start === 0,
      useCount: historyEntry.useCount,
    });
  }

  return ranked
    .sort(compareRanked)
    .slice(0, MAX_ITEM_SUGGESTIONS)
    .map(({ checkedItemId, matchLength, matchStart, name }) => ({
      checkedItemId,
      matchLength,
      matchStart,
      name,
    }));
}
