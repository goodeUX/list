import { FREE_LIST_LIMIT, isAtFreeListLimit } from '@/lib/listLimits';

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
