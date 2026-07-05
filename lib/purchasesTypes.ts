export type PurchasePeriod = 'monthly' | 'annual' | 'other';

export type PremiumPackage = {
  identifier: string;
  /** Localized price from the store, e.g. "$2.99". Never hardcode prices. */
  priceString: string;
  period: PurchasePeriod;
};

export type EntitlementSnapshot = {
  premium: boolean;
  willRenew: boolean;
  /** ISO date the current paid period ends, when known. */
  expirationDate: string | null;
  /** Store subscription-management page for this user, when known. */
  managementURL: string | null;
};

export const INACTIVE_ENTITLEMENT: EntitlementSnapshot = {
  premium: false,
  willRenew: false,
  expirationDate: null,
  managementURL: null,
};

export type PurchaseOutcome = 'purchased' | 'cancelled';
