import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';

import {
  INACTIVE_ENTITLEMENT,
  type EntitlementSnapshot,
  type PremiumPackage,
  type PurchaseOutcome,
} from '@/lib/purchasesTypes';

type PurchasesModule = typeof import('react-native-purchases');

const appleKey = (process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? '').trim();
const googleKey = (process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ?? '').trim();
const ENTITLEMENT_ID = 'premium';

// Same rationale as lib/socialAuth.native.ts: never import the package unless
// the native module is actually in the binary (absent in Expo Go and in dev
// clients built before this dependency was added).
let purchasesModule: PurchasesModule | null | undefined;

function getPurchasesModule(): PurchasesModule | null {
  if (purchasesModule === undefined) {
    try {
      const hasNativeModule =
        TurboModuleRegistry.get('RNPurchases') != null ||
        (NativeModules as Record<string, unknown>).RNPurchases != null;
      purchasesModule = hasNativeModule
        ? (require('react-native-purchases') as PurchasesModule)
        : null;
    } catch {
      purchasesModule = null;
    }
  }

  return purchasesModule;
}

function getApiKey(): string {
  return Platform.OS === 'ios' ? appleKey : googleKey;
}

export function isPurchasesAvailable(): boolean {
  return getApiKey().length > 0 && getPurchasesModule() !== null;
}

let configured = false;

export function configurePurchases(): void {
  const mod = getPurchasesModule();
  if (!mod || configured || getApiKey().length === 0) {
    return;
  }

  mod.default.configure({ apiKey: getApiKey() });
  configured = true;
}

/** Ties the subscription to the Firebase account (cross-device, reinstall-safe). */
export async function setPurchasesUser(uid: string | null): Promise<void> {
  const mod = getPurchasesModule();
  if (!mod || !isPurchasesAvailable()) {
    return;
  }
  configurePurchases();

  try {
    if (uid) {
      await mod.default.logIn(uid);
    } else if (!(await mod.default.isAnonymous())) {
      await mod.default.logOut();
    }
  } catch (error) {
    console.warn('[purchases] failed to switch user', error);
  }
}

function toEntitlementSnapshot(customerInfo: CustomerInfo): EntitlementSnapshot {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  return {
    premium: entitlement != null,
    willRenew: entitlement?.willRenew ?? false,
    expirationDate: entitlement?.expirationDate ?? null,
    managementURL: customerInfo.managementURL ?? null,
  };
}

export function subscribeToEntitlement(
  onChange: (snapshot: EntitlementSnapshot) => void,
): () => void {
  const mod = getPurchasesModule();
  if (!mod || !isPurchasesAvailable()) {
    onChange(INACTIVE_ENTITLEMENT);
    return () => {};
  }
  configurePurchases();

  const listener = (info: CustomerInfo) => onChange(toEntitlementSnapshot(info));
  mod.default.addCustomerInfoUpdateListener(listener);

  void mod.default
    .getCustomerInfo()
    .then((info) => onChange(toEntitlementSnapshot(info)))
    .catch(() => onChange(INACTIVE_ENTITLEMENT));

  return () => {
    mod.default.removeCustomerInfoUpdateListener(listener);
  };
}

export async function getPremiumPackages(): Promise<PremiumPackage[]> {
  const mod = getPurchasesModule();
  if (!mod || !isPurchasesAvailable()) {
    return [];
  }
  configurePurchases();

  try {
    const offerings = await mod.default.getOfferings();
    const available = offerings.current?.availablePackages ?? [];
    return available.map((pkg) => ({
      identifier: pkg.identifier,
      period:
        pkg.packageType === mod.PACKAGE_TYPE.MONTHLY
          ? 'monthly'
          : pkg.packageType === mod.PACKAGE_TYPE.ANNUAL
            ? 'annual'
            : 'other',
      priceString: pkg.product.priceString,
    }));
  } catch {
    return [];
  }
}

export async function purchasePremiumPackage(
  identifier: string,
): Promise<PurchaseOutcome> {
  const mod = getPurchasesModule();
  if (!mod || !isPurchasesAvailable()) {
    throw new Error('Purchases are not available on this device');
  }
  configurePurchases();

  const offerings = await mod.default.getOfferings();
  const pkg = offerings.current?.availablePackages.find(
    (candidate) => candidate.identifier === identifier,
  );
  if (!pkg) {
    throw new Error('That plan is not available right now');
  }

  try {
    // The entitlement listener fires with the new state; PlanContext updates.
    await mod.default.purchasePackage(pkg);
    return 'purchased';
  } catch (error) {
    if ((error as { userCancelled?: boolean }).userCancelled) {
      return 'cancelled';
    }
    throw error;
  }
}

/** Apple review requirement: users must be able to restore prior purchases. */
export async function restorePremiumPurchases(): Promise<boolean> {
  const mod = getPurchasesModule();
  if (!mod || !isPurchasesAvailable()) {
    return false;
  }
  configurePurchases();

  const info = await mod.default.restorePurchases();
  return toEntitlementSnapshot(info).premium;
}
