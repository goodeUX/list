import { getItemSuggestions } from '@/lib/itemSuggestions';
import type { ListHistoryEntry } from '@/lib/itemSuggestions';

function entry(
  name: string,
  useCount = 1,
  lastUsedAt = new Date('2026-01-01T00:00:00Z'),
): ListHistoryEntry {
  return { name, useCount, lastUsedAt };
}

function names(query: string, history: ListHistoryEntry[]): string[] {
  return getItemSuggestions(query, history, []).map((suggestion) => suggestion.name);
}

describe('getItemSuggestions matching', () => {
  it('matches a prefix of the whole name', () => {
    expect(names('cho', [entry('chocolate')])).toEqual(['chocolate']);
  });

  it('matches a prefix of a word inside the name', () => {
    expect(names('cho', [entry('hot chocolate')])).toEqual(['hot chocolate']);
  });

  it('matches a prefix of a hyphenated word', () => {
    expect(names('cream', [entry('ice-cream')])).toEqual(['ice-cream']);
  });

  it('does not match in the middle of a word', () => {
    expect(names('cho', [entry('nacho chips')])).toEqual([]);
  });

  it('ignores case on both sides', () => {
    expect(names('CHO', [entry('Chocolate')])).toEqual(['Chocolate']);
  });

  it('ignores diacritics on both sides', () => {
    expect(names('cre', [entry('Crème fraîche')])).toEqual(['Crème fraîche']);
    expect(names('crè', [entry('creme fraiche')])).toEqual(['creme fraiche']);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(names('  cho  ', [entry('chocolate')])).toEqual(['chocolate']);
  });

  it('returns nothing for an empty or whitespace-only query', () => {
    expect(names('', [entry('chocolate')])).toEqual([]);
    expect(names('   ', [entry('chocolate')])).toEqual([]);
  });

  it('matches on a single typed letter', () => {
    expect(names('c', [entry('chocolate')])).toEqual(['chocolate']);
  });

  it('still suggests a name the query already spells in full', () => {
    expect(names('chocolate', [entry('chocolate')])).toEqual(['chocolate']);
  });
});

describe('getItemSuggestions ranking', () => {
  it('ranks whole-name prefix matches above word matches', () => {
    const history = [entry('hot chocolate', 99), entry('chocolate', 1)];

    expect(names('cho', history)).toEqual(['chocolate', 'hot chocolate']);
  });

  it('ranks the most-used name first', () => {
    const history = [entry('cheese', 2), entry('chocolate', 7), entry('chips', 4)];

    expect(names('ch', history)).toEqual(['chocolate', 'chips', 'cheese']);
  });

  it('breaks a use-count tie with the most recently used name', () => {
    const history = [
      entry('cheese', 3, new Date('2026-01-01T00:00:00Z')),
      entry('chocolate', 3, new Date('2026-06-01T00:00:00Z')),
    ];

    expect(names('ch', history)).toEqual(['chocolate', 'cheese']);
  });

  it('breaks a remaining tie alphabetically', () => {
    const when = new Date('2026-01-01T00:00:00Z');
    const history = [entry('chocolate', 3, when), entry('Cheese', 3, when)];

    expect(names('ch', history)).toEqual(['Cheese', 'chocolate']);
  });

  it('renders at most 20 matches', () => {
    const history = Array.from({ length: 30 }, (_, index) =>
      entry(`chocolate ${index}`, 30 - index),
    );

    expect(names('cho', history)).toHaveLength(20);
  });
});

describe('getItemSuggestions against items already on the list', () => {
  const history = [entry('chocolate')];

  it('hides a name that is on the list and unchecked', () => {
    const items = [{ checked: false, id: 'item-1', name: 'chocolate' }];

    expect(getItemSuggestions('cho', history, items)).toEqual([]);
  });

  it('keeps a name that is on the list but checked, pointing at that item', () => {
    const items = [{ checked: true, id: 'item-1', name: 'chocolate' }];

    expect(getItemSuggestions('cho', history, items)).toEqual([
      expect.objectContaining({ checkedItemId: 'item-1', name: 'chocolate' }),
    ]);
  });

  it('leaves checkedItemId null when the name is not on the list', () => {
    expect(getItemSuggestions('cho', history, [])).toEqual([
      expect.objectContaining({ checkedItemId: null, name: 'chocolate' }),
    ]);
  });

  it('compares against list items ignoring case and diacritics', () => {
    const items = [{ checked: false, id: 'item-1', name: 'Chocolaté' }];

    expect(getItemSuggestions('cho', history, items)).toEqual([]);
  });
});

describe('getItemSuggestions match highlighting', () => {
  it('reports the matched range at the start of the name', () => {
    expect(getItemSuggestions('cho', [entry('chocolate')], [])[0]).toEqual(
      expect.objectContaining({ matchLength: 3, matchStart: 0 }),
    );
  });

  it('reports the matched range of an inner word', () => {
    expect(getItemSuggestions('cho', [entry('hot chocolate')], [])[0]).toEqual(
      expect.objectContaining({ matchLength: 3, matchStart: 4 }),
    );
  });

  it('reports a range in the original string when accents were folded', () => {
    expect(getItemSuggestions('fra', [entry('Crème fraîche')], [])[0]).toEqual(
      expect.objectContaining({ matchLength: 3, matchStart: 6 }),
    );
  });
});
