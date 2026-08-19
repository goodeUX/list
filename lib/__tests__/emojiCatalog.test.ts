import {
  activeCategoryIndex,
  buildEmojiLayout,
  buildSearchRows,
  searchEmojis,
  EMOJI_CATEGORIES,
} from '@/lib/emojiCatalog';

const HEADER = 34;
const ROW = 44;

describe('EMOJI_CATEGORIES', () => {
  it('exposes every category with a readable label', () => {
    expect(EMOJI_CATEGORIES.length).toBeGreaterThan(0);
    expect(EMOJI_CATEGORIES[0].key).toBe('smileys_emotion');
    expect(EMOJI_CATEGORIES[0].label).toBe('Smileys & Emotion');
    EMOJI_CATEGORIES.forEach((category) => {
      expect(category.data.length).toBeGreaterThan(0);
    });
  });

  it('has no search or recents pseudo-category', () => {
    const keys = EMOJI_CATEGORIES.map((category) => category.key);
    expect(keys).not.toContain('search');
    expect(keys).not.toContain('recently_used');
  });
});

describe('searchEmojis', () => {
  it('returns null below the minimum query length', () => {
    expect(searchEmojis('')).toBeNull();
    expect(searchEmojis('c')).toBeNull();
    expect(searchEmojis('  ')).toBeNull();
  });

  it('matches on name', () => {
    const results = searchEmojis('grinning face');
    expect(results).not.toBeNull();
    expect(results!.some((item) => item.emoji === '😀')).toBe(true);
  });

  it('matches on keyword', () => {
    const results = searchEmojis('joy');
    expect(results!.length).toBeGreaterThan(0);
  });

  it('is case insensitive', () => {
    expect(searchEmojis('CAT')!.length).toBe(searchEmojis('cat')!.length);
  });

  it('returns an empty array for no matches', () => {
    expect(searchEmojis('zzzzzznotanemoji')).toEqual([]);
  });
});

describe('buildEmojiLayout', () => {
  it('emits a header per category followed by its emoji rows', () => {
    const { rows } = buildEmojiLayout(8, HEADER, ROW);
    const headers = rows.filter((row) => row.type === 'header');

    expect(headers).toHaveLength(EMOJI_CATEGORIES.length);
    expect(rows[0].type).toBe('header');
    expect(rows[1].type).toBe('emojis');
  });

  it('packs each row up to the column count', () => {
    const columns = 8;
    const { rows } = buildEmojiLayout(columns, HEADER, ROW);

    rows.forEach((row) => {
      if (row.type === 'emojis') {
        expect(row.items.length).toBeGreaterThan(0);
        expect(row.items.length).toBeLessThanOrEqual(columns);
      }
    });
  });

  it('includes every emoji exactly once', () => {
    const { rows } = buildEmojiLayout(8, HEADER, ROW);
    const laidOut = rows.flatMap((row) => (row.type === 'emojis' ? row.items : []));
    const total = EMOJI_CATEGORIES.reduce((sum, category) => sum + category.data.length, 0);

    expect(laidOut).toHaveLength(total);
  });

  it('produces offsets matching the running row heights', () => {
    const { rows, offsets } = buildEmojiLayout(8, HEADER, ROW);

    expect(offsets).toHaveLength(rows.length + 1);
    expect(offsets[0]).toBe(0);

    rows.forEach((row, index) => {
      const height = row.type === 'header' ? HEADER : ROW;
      expect(offsets[index + 1] - offsets[index]).toBe(height);
    });
  });

  it('points categoryOffsets at each header offset', () => {
    const { rows, offsets, categoryOffsets } = buildEmojiLayout(8, HEADER, ROW);

    expect(categoryOffsets).toHaveLength(EMOJI_CATEGORIES.length);
    categoryOffsets.forEach((categoryOffset, index) => {
      const rowIndex = rows.findIndex(
        (row) => row.type === 'header' && row.categoryKey === EMOJI_CATEGORIES[index].key,
      );
      expect(offsets[rowIndex]).toBe(categoryOffset);
    });
  });
});

describe('buildSearchRows', () => {
  it('chunks results into rows without headers', () => {
    const results = searchEmojis('cat')!;
    const rows = buildSearchRows(results, 8);

    expect(rows.every((row) => row.type === 'emojis')).toBe(true);
    expect(rows.flatMap((row) => (row.type === 'emojis' ? row.items : []))).toHaveLength(
      results.length,
    );
  });

  it('returns nothing for no results', () => {
    expect(buildSearchRows([], 8)).toEqual([]);
  });
});

describe('activeCategoryIndex', () => {
  const offsets = [0, 100, 250, 400];

  it('reports the first category at the top', () => {
    expect(activeCategoryIndex(offsets, 0)).toBe(0);
    expect(activeCategoryIndex(offsets, 50)).toBe(0);
  });

  it('switches exactly when a header reaches the top', () => {
    expect(activeCategoryIndex(offsets, 100)).toBe(1);
    expect(activeCategoryIndex(offsets, 249)).toBe(1);
    expect(activeCategoryIndex(offsets, 250)).toBe(2);
  });

  it('clamps to the last category past the end', () => {
    expect(activeCategoryIndex(offsets, 99999)).toBe(3);
  });

  it('handles negative offsets from overscroll', () => {
    expect(activeCategoryIndex(offsets, -40)).toBe(0);
  });
});
