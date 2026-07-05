import { getPremiumPackages, isPurchasesAvailable, restorePremiumPurchases } from '@/lib/purchases';

// Under jest-expo the .native implementation loads, the RNPurchases native
// module is absent, and no API key is set — the same degraded path as Expo Go.
test('purchases are unavailable when the native module is absent', () => {
  expect(isPurchasesAvailable()).toBe(false);
});

test('degraded implementations return empty results instead of throwing', async () => {
  await expect(getPremiumPackages()).resolves.toEqual([]);
  await expect(restorePremiumPurchases()).resolves.toBe(false);
});
