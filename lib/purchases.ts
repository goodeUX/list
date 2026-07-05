import {
  INACTIVE_ENTITLEMENT,
  type EntitlementSnapshot,
  type PremiumPackage,
  type PurchaseOutcome,
} from '@/lib/purchasesTypes';

// Web build: store purchases are mobile-only. Premium status on web comes
// from the users/{uid} mirror and comp grants via PlanContext.

export function isPurchasesAvailable(): boolean {
  return false;
}

export function configurePurchases(): void {}

export async function setPurchasesUser(_uid: string | null): Promise<void> {}

export function subscribeToEntitlement(
  onChange: (snapshot: EntitlementSnapshot) => void,
): () => void {
  onChange(INACTIVE_ENTITLEMENT);
  return () => {};
}

export async function getPremiumPackages(): Promise<PremiumPackage[]> {
  return [];
}

export async function purchasePremiumPackage(
  _identifier: string,
): Promise<PurchaseOutcome> {
  throw new Error('Purchases are not available on this platform');
}

export async function restorePremiumPurchases(): Promise<boolean> {
  return false;
}
