import { emojisByCategory, en, type EmojisByCategory } from 'rn-emoji-keyboard';

export type CatalogEmoji = {
  emoji: string;
  name: string;
  keywords?: string[];
};

export type EmojiCategory = {
  key: string;
  label: string;
  data: CatalogEmoji[];
};

/** Every emoji grouped by category, in the order they should be displayed. */
export const EMOJI_CATEGORIES: EmojiCategory[] = (
  emojisByCategory as EmojisByCategory[]
).map((category) => ({
  key: category.title,
  label: (en as Record<string, string>)[category.title] ?? category.title,
  data: category.data.map(({ emoji, name, keywords }) => ({ emoji, name, keywords })),
}));

const ALL_EMOJIS: CatalogEmoji[] = EMOJI_CATEGORIES.flatMap((category) => category.data);

const MIN_SEARCH_LENGTH = 2;

/**
 * Case-insensitive search over emoji names and keywords. Returns null (rather
 * than an empty list) when the query is too short to search on, so callers can
 * tell "not searching" apart from "no matches".
 */
export function searchEmojis(query: string): CatalogEmoji[] | null {
  const trimmed = query.trim().toLowerCase();

  if (trimmed.length < MIN_SEARCH_LENGTH) {
    return null;
  }

  return ALL_EMOJIS.filter(
    (item) =>
      item.name.toLowerCase().includes(trimmed) ||
      item.keywords?.some((keyword) => keyword.toLowerCase().includes(trimmed)),
  );
}

// A flat row list is used instead of a SectionList so that every row has a known
// height, which makes both scroll-to-category and the active-tab calculation exact.
export type EmojiRow =
  | { type: 'header'; key: string; categoryKey: string; label: string }
  | { type: 'emojis'; key: string; items: CatalogEmoji[] };

export type EmojiLayout = {
  rows: EmojiRow[];
  /** Pixel offset of each row, plus a final entry for the total content height. */
  offsets: number[];
  /** Scroll offset of each category header, indexed the same as EMOJI_CATEGORIES. */
  categoryOffsets: number[];
};

function chunk(items: CatalogEmoji[], size: number): CatalogEmoji[][] {
  const rows: CatalogEmoji[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

/** Builds the full row list for the browsing view, with per-row scroll offsets. */
export function buildEmojiLayout(
  columns: number,
  headerHeight: number,
  rowHeight: number,
): EmojiLayout {
  const rows: EmojiRow[] = [];
  const offsets: number[] = [];
  const categoryOffsets: number[] = [];
  let offset = 0;

  for (const category of EMOJI_CATEGORIES) {
    categoryOffsets.push(offset);

    rows.push({
      type: 'header',
      key: `header-${category.key}`,
      categoryKey: category.key,
      label: category.label,
    });
    offsets.push(offset);
    offset += headerHeight;

    chunk(category.data, columns).forEach((items, index) => {
      rows.push({ type: 'emojis', key: `${category.key}-${index}`, items });
      offsets.push(offset);
      offset += rowHeight;
    });
  }

  offsets.push(offset);

  return { rows, offsets, categoryOffsets };
}

/** Builds rows for search results: a plain grid with no category headers. */
export function buildSearchRows(results: CatalogEmoji[], columns: number): EmojiRow[] {
  return chunk(results, columns).map((items, index) => ({
    type: 'emojis' as const,
    key: `search-${index}`,
    items,
  }));
}

/**
 * The category whose section contains `scrollOffset` — i.e. the one the tab bar
 * should highlight. Returns the last category whose header has scrolled past.
 */
export function activeCategoryIndex(categoryOffsets: number[], scrollOffset: number): number {
  let active = 0;

  for (let index = 0; index < categoryOffsets.length; index += 1) {
    if (categoryOffsets[index] <= scrollOffset) {
      active = index;
    } else {
      break;
    }
  }

  return active;
}
