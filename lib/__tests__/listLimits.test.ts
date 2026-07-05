import {
  FREE_LIST_LIMIT,
  isAtFreeListLimit,
  canCreateList,
  canJoinList,
  isListEditable,
  needsEditableListPick,
  resolveEditableListIds,
} from '@/lib/listLimits';

test('the free tier is capped at two lists', () => {
  expect(FREE_LIST_LIMIT).toBe(2);
});

test('is not at the limit below the cap', () => {
  expect(isAtFreeListLimit(0)).toBe(false);
  expect(isAtFreeListLimit(1)).toBe(false);
});

test('is at the limit once the cap is reached or exceeded', () => {
  expect(isAtFreeListLimit(2)).toBe(true);
  expect(isAtFreeListLimit(3)).toBe(true);
});

test('free users can create below the cap, not at it; premium always can', () => {
  expect(canCreateList('free', 1)).toBe(true);
  expect(canCreateList('free', 2)).toBe(false);
  expect(canCreateList('premium', 50)).toBe(true);
});

test('joining follows the same cap as creating', () => {
  expect(canJoinList('free', 1)).toBe(true);
  expect(canJoinList('free', 2)).toBe(false);
  expect(canJoinList('premium', 50)).toBe(true);
});

test('everything is editable at or under the cap, or on premium', () => {
  expect(resolveEditableListIds('free', ['a', 'b'], undefined)).toBe('all');
  expect(resolveEditableListIds('premium', ['a', 'b', 'c'], undefined)).toBe('all');
});

test('over the cap only valid picks are editable', () => {
  expect(resolveEditableListIds('free', ['a', 'b', 'c'], ['a', 'c'])).toEqual(['a', 'c']);
  // Picks pointing at deleted/left lists are dropped.
  expect(resolveEditableListIds('free', ['a', 'b', 'c'], ['a', 'gone'])).toEqual(['a']);
  expect(resolveEditableListIds('free', ['a', 'b', 'c'], undefined)).toEqual([]);
});

test('a pick is needed when over cap without two valid choices', () => {
  expect(needsEditableListPick('free', ['a', 'b', 'c'], ['a', 'c'])).toBe(false);
  expect(needsEditableListPick('free', ['a', 'b', 'c'], ['a'])).toBe(true);
  expect(needsEditableListPick('free', ['a', 'b'], undefined)).toBe(false);
  expect(needsEditableListPick('premium', ['a', 'b', 'c'], undefined)).toBe(false);
});

test('isListEditable respects the resolved set', () => {
  expect(isListEditable('a', 'all')).toBe(true);
  expect(isListEditable('a', ['a', 'b'])).toBe(true);
  expect(isListEditable('c', ['a', 'b'])).toBe(false);
});
