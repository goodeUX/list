import {
  draftAfterStoredChange,
  savableFieldValue,
  storedFieldValue,
  withPendingSubItemRenames,
} from '@/lib/itemDraft';
import type { ListItem, SubItem } from '@/lib/types';

function makeItem(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: 'item-1',
    name: 'Milk',
    quantity: null,
    description: null,
    link: null,
    checked: false,
    order: 0,
    subItems: [],
    createdBy: 'u',
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

function makeSub(overrides: Partial<SubItem> & { id: string }): SubItem {
  return { name: 'x', checked: false, order: 0, ...overrides };
}

describe('savableFieldValue', () => {
  it('trims quantity and description, saving empty as null', () => {
    expect(savableFieldValue('description', '  Organic only \n')).toBe('Organic only');
    expect(savableFieldValue('description', '   ')).toBeNull();
    expect(savableFieldValue('quantity', ' 2 lbs ')).toBe('2 lbs');
    expect(savableFieldValue('quantity', '')).toBeNull();
  });

  it('refuses to save an empty name', () => {
    expect(savableFieldValue('name', '   ')).toBeUndefined();
    expect(savableFieldValue('name', ' Eggs ')).toBe('Eggs');
  });

  it('normalizes valid links, clears empty ones and skips invalid ones', () => {
    expect(savableFieldValue('link', 'example.com')).toBe('https://example.com/');
    expect(savableFieldValue('link', '  ')).toBeNull();
    expect(savableFieldValue('link', 'not a url')).toBeUndefined();
  });
});

describe('storedFieldValue', () => {
  it('reads nullable fields as null when absent', () => {
    const item = makeItem({ description: 'Notes' });
    expect(storedFieldValue(item, 'name')).toBe('Milk');
    expect(storedFieldValue(item, 'description')).toBe('Notes');
    expect(storedFieldValue(item, 'quantity')).toBeNull();
  });
});

describe('draftAfterStoredChange', () => {
  it('keeps the draft when it already represents the stored value', () => {
    // The echo of our own save must not strip a trailing space mid-typing.
    expect(draftAfterStoredChange('description', 'Buy the ', 'Buy the')).toBe('Buy the ');
    expect(draftAfterStoredChange('link', 'example.com', 'https://example.com/')).toBe(
      'example.com',
    );
  });

  it('adopts a stored value that was changed elsewhere', () => {
    expect(draftAfterStoredChange('description', 'old', 'new')).toBe('new');
    expect(draftAfterStoredChange('quantity', '2', null)).toBe('');
  });
});

describe('withPendingSubItemRenames', () => {
  it('applies each pending rename', () => {
    const subItems = [makeSub({ id: 'a', name: 'A' }), makeSub({ id: 'b', name: 'B', order: 1 })];
    const next = withPendingSubItemRenames(subItems, new Map([['b', ' Bee ']]));
    expect(next.map((entry) => entry.name)).toEqual(['A', 'Bee']);
  });

  it('ignores renames to an empty name or a removed sub-item', () => {
    const subItems = [makeSub({ id: 'a', name: 'A' })];
    const next = withPendingSubItemRenames(
      subItems,
      new Map([
        ['a', '  '],
        ['gone', 'Ghost'],
      ]),
    );
    expect(next.map((entry) => entry.name)).toEqual(['A']);
  });
});
