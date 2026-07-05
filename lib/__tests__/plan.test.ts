import { resolvePlan } from '@/lib/plan';

test('no entitlements resolves to free', () => {
  expect(resolvePlan(false, false)).toEqual({ plan: 'free', planSource: null });
});

test('a store subscription resolves to premium via store', () => {
  expect(resolvePlan(true, false)).toEqual({ plan: 'premium', planSource: 'store' });
});

test('a comp grant resolves to premium via comp', () => {
  expect(resolvePlan(false, true)).toEqual({ plan: 'premium', planSource: 'comp' });
});

test('store wins when both apply so subscription management stays visible', () => {
  expect(resolvePlan(true, true)).toEqual({ plan: 'premium', planSource: 'store' });
});
