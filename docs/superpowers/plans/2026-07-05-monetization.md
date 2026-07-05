# Free/Premium Monetization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free/premium plan choice to signup, RevenueCat-managed subscriptions, owner-managed complimentary grants, a 2-list cap for free accounts (create + join, with read-only overflow), and plan management in Settings.

**Architecture:** Client-enforced caps with RevenueCat as the server-validated source of truth for paid entitlements; a Firestore `premiumGrants/{email}` allowlist for comps; a `PlanContext` that merges both and mirrors store status to `users/{uid}`. The purchases SDK is wrapped behind the same runtime-probe pattern as Google sign-in so Expo Go and web degrade gracefully.

**Tech Stack:** Expo SDK 54 / expo-router 6, Firebase JS SDK (Auth + Firestore), react-native-purchases (RevenueCat), jest-expo.

**Spec:** `docs/superpowers/specs/2026-07-05-monetization-design.md`

---

## File structure

New files:

| File | Responsibility |
| --- | --- |
| `lib/plan.ts` | Plan types + pure `resolvePlan(storeActive, compActive)` |
| `lib/purchasesTypes.ts` | Shared types for both purchases implementations |
| `lib/purchases.ts` | Web/unavailable fallback implementation |
| `lib/purchases.native.ts` | RevenueCat wrapper behind a native-module probe |
| `lib/premiumGrants.ts` | Comp-grant email normalization + Firestore subscription |
| `contexts/PlanContext.tsx` | Merges store + comp status, user-doc mirror, `activeListIds` |
| `hooks/useListAccess.ts` | Per-list read-only resolution |
| `components/BenefitsModal.tsx` | Generalized animated benefits dialog (extracted from SignInBenefitsModal) |
| `components/UpgradePromptModal.tsx` | "You've hit the cap" premium pitch |
| `components/ChooseEditableListsModal.tsx` | Over-cap "pick 2 lists" chooser |
| `app/(auth)/choose-plan.tsx` | Free vs Premium chooser screen |
| `app/(auth)/paywall.tsx` | Monthly/annual purchase screen (signup + settings entry) |
| `lib/__tests__/plan.test.ts`, `lib/__tests__/premiumGrants.test.ts`, `lib/__tests__/purchases.test.ts` | Unit tests |
| `docs/premium-setup.md` | Store/RevenueCat/console setup + comp-grant how-to |

Modified files:

| File | Change |
| --- | --- |
| `lib/listLimits.ts` (+ test) | Plan-aware cap helpers |
| `lib/types.ts` | `AppUser.premium?`, `AppUser.activeListIds?` |
| `firebase/firestore.rules` | `premiumGrants` read rule |
| `app/_layout.tsx` | Mount `PlanProvider` |
| `app/(auth)/_layout.tsx` | Register new screens |
| `app/(auth)/sign-up.tsx` | `plan` param → paywall hand-off |
| `app/(auth)/sign-in.tsx` | Switch-to-sign-up goes through chooser |
| `lib/authRedirect.ts` | `buildPlanChooserHref` |
| `app/index.tsx` | Signed-in create gate, chooser modal, lock badges, copy |
| `components/SignInBenefitsModal.tsx` | Rebased on BenefitsModal, copy update |
| `components/ListCard.tsx` | `locked` prop |
| `app/join/[listId].tsx` | Join gate |
| `app/list/[id]/index.tsx` | Read-only banner + interaction guards |
| `app/settings/index.tsx` | Plan section |
| `AGENTS.md`, `.env.example` | Expo Go note, env keys |

Conventions used throughout: theme via `useTheme()` (`colors`, `radii`, `spacing`), fonts `Fraunces_600SemiBold` (titles) / `NunitoSans_*` (body), alerts via `showAppAlert` (never native `Alert`), buttons via `components/Button` (`variant: 'primary' | 'ghost' | 'surface'`).

---

### Task 1: Plan resolution helper (`lib/plan.ts`)

**Files:**
- Create: `lib/plan.ts`
- Test: `lib/__tests__/plan.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/plan.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/plan.test.ts`
Expected: FAIL — cannot find module `@/lib/plan`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/plan.ts
export type Plan = 'free' | 'premium';

/** Where premium came from: a store subscription, an owner comp grant, or n/a. */
export type PlanSource = 'store' | 'comp' | null;

export type ResolvedPlan = { plan: Plan; planSource: PlanSource };

/** Premium = paid OR comped. Store wins so subscription management stays visible. */
export function resolvePlan(storeActive: boolean, compActive: boolean): ResolvedPlan {
  if (storeActive) {
    return { plan: 'premium', planSource: 'store' };
  }
  if (compActive) {
    return { plan: 'premium', planSource: 'comp' };
  }
  return { plan: 'free', planSource: null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/plan.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/plan.ts lib/__tests__/plan.test.ts
git commit -m "Add plan resolution helper merging store and comp entitlements"
```

---

### Task 2: Plan-aware list limits (`lib/listLimits.ts`)

**Files:**
- Modify: `lib/listLimits.ts`
- Test: `lib/__tests__/listLimits.test.ts` (extend, keep existing tests)

- [ ] **Step 1: Add failing tests** (append to the existing file)

```ts
// lib/__tests__/listLimits.test.ts — append below existing tests
import {
  canCreateList,
  canJoinList,
  isListEditable,
  needsEditableListPick,
  resolveEditableListIds,
} from '@/lib/listLimits';

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
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test -- lib/__tests__/listLimits.test.ts`
Expected: existing 3 pass, new ones FAIL (functions not exported).

- [ ] **Step 3: Implement** — replace the whole file:

```ts
// lib/listLimits.ts
import type { Plan } from '@/lib/plan';

/** Lists a free user (signed-out local OR signed-in free plan) may own/join. */
export const FREE_LIST_LIMIT = 2;

/** True once a local-only user has as many lists as the free tier allows. */
export function isAtFreeListLimit(listCount: number): boolean {
  return listCount >= FREE_LIST_LIMIT;
}

/** Signed-in create gate: free accounts are held at the cap; premium is not. */
export function canCreateList(plan: Plan, listCount: number): boolean {
  return plan === 'premium' || !isAtFreeListLimit(listCount);
}

/** Joining a shared list counts toward the same cap as creating one. */
export function canJoinList(plan: Plan, listCount: number): boolean {
  return plan === 'premium' || !isAtFreeListLimit(listCount);
}

/**
 * Which lists stay editable. 'all' when the cap doesn't bite. Over the cap
 * (post-downgrade) only the user's picked lists — filtered to ones that still
 * exist — are editable; the rest are read-only until a slot frees up.
 */
export function resolveEditableListIds(
  plan: Plan,
  listIds: string[],
  activeListIds: string[] | undefined,
): string[] | 'all' {
  if (plan === 'premium' || listIds.length <= FREE_LIST_LIMIT) {
    return 'all';
  }

  return (activeListIds ?? [])
    .filter((id) => listIds.includes(id))
    .slice(0, FREE_LIST_LIMIT);
}

/** True when over the cap without a complete, valid pick — show the chooser. */
export function needsEditableListPick(
  plan: Plan,
  listIds: string[],
  activeListIds: string[] | undefined,
): boolean {
  const editable = resolveEditableListIds(plan, listIds, activeListIds);
  return editable !== 'all' && editable.length < FREE_LIST_LIMIT;
}

export function isListEditable(
  listId: string,
  editableListIds: string[] | 'all',
): boolean {
  return editableListIds === 'all' || editableListIds.includes(listId);
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test -- lib/__tests__/listLimits.test.ts`
Expected: all pass (old + new).

- [ ] **Step 5: Commit**

```bash
git add lib/listLimits.ts lib/__tests__/listLimits.test.ts
git commit -m "Add plan-aware list cap helpers for create/join/read-only gating"
```

---

### Task 3: Comp grants — lib + security rules

**Files:**
- Create: `lib/premiumGrants.ts`
- Modify: `firebase/firestore.rules`
- Test: `lib/__tests__/premiumGrants.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/premiumGrants.test.ts
import { normalizePremiumGrantEmail } from '@/lib/premiumGrants';

test('lowercases and trims the email to match grant doc ids', () => {
  expect(normalizePremiumGrantEmail('  Geoff@Example.COM ')).toBe('geoff@example.com');
});

test('empty and missing emails normalize to null', () => {
  expect(normalizePremiumGrantEmail('')).toBeNull();
  expect(normalizePremiumGrantEmail('   ')).toBeNull();
  expect(normalizePremiumGrantEmail(null)).toBeNull();
  expect(normalizePremiumGrantEmail(undefined)).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/premiumGrants.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/premiumGrants.ts
import { doc, onSnapshot } from 'firebase/firestore';

import { db } from '@/lib/firebase';

/**
 * Owner-managed complimentary premium. A doc at premiumGrants/{email}
 * (lowercased email as the id, created in the Firebase console) grants
 * premium to whichever account signs in with that email. Existence of the
 * doc IS the grant; fields are informational only.
 */

export function normalizePremiumGrantEmail(
  email: string | null | undefined,
): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

/**
 * Live-subscribes to the signed-in user's own grant. Grants and revocations
 * apply without a reinstall. Errors (e.g. rules not yet deployed) resolve to
 * "no grant" rather than throwing.
 */
export function subscribeToPremiumGrant(
  email: string | null | undefined,
  onChange: (active: boolean) => void,
): () => void {
  const normalized = normalizePremiumGrantEmail(email);
  if (!normalized) {
    onChange(false);
    return () => {};
  }

  return onSnapshot(
    doc(db, 'premiumGrants', normalized),
    (snapshot) => onChange(snapshot.exists()),
    () => onChange(false),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/premiumGrants.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the security rule** — in `firebase/firestore.rules`, insert this block between the `users` match (ends line 51) and the `lists` match (starts line 53):

```
    match /premiumGrants/{email} {
      // Owner writes these from the Firebase console only. A signed-in user
      // may check the single grant matching their own sign-in email; nobody
      // can enumerate or write the collection from the client.
      allow get: if isSignedIn()
        && 'email' in request.auth.token
        && request.auth.token.email.lower() == email;
    }
```

- [ ] **Step 6: Deploy the rules**

Run from the repo root: `firebase deploy --only firestore:rules`
Expected: `✔ Deploy complete!`. (If not logged in: `firebase login` first. If this machine can't deploy, note it in the task report — the code degrades to "no grant" until rules ship.)

- [ ] **Step 7: Commit**

```bash
git add lib/premiumGrants.ts lib/__tests__/premiumGrants.test.ts firebase/firestore.rules
git commit -m "Add owner-managed premiumGrants allowlist with self-only read rule"
```

---

### Task 4: Purchases wrapper (RevenueCat behind a probe)

**Files:**
- Modify: `package.json` (dependency)
- Create: `lib/purchasesTypes.ts`, `lib/purchases.ts`, `lib/purchases.native.ts`
- Modify: `.env.example`
- Test: `lib/__tests__/purchases.test.ts`

Background: `react-native-purchases` needs a dev build (like Google sign-in — see the probe pattern in `lib/socialAuth.native.ts:21-38`, native module name here is `RNPurchases`). jest-expo resolves `.native.ts` first, so tests exercise the probe path with the module absent — exactly the Expo Go behavior.

- [ ] **Step 1: Install the SDK**

Run: `npx expo install react-native-purchases`
Expected: added to `package.json` dependencies. (Dev clients must be rebuilt with `npx expo run:android` / `run:ios` before purchases work on device — note this in the final report.)

- [ ] **Step 2: Write the failing test**

```ts
// lib/__tests__/purchases.test.ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- lib/__tests__/purchases.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Create the shared types**

```ts
// lib/purchasesTypes.ts
export type PurchasePeriod = 'monthly' | 'annual' | 'other';

export type PremiumPackage = {
  identifier: string;
  period: PurchasePeriod;
  /** Localized price from the store, e.g. "$2.99". Never hardcode prices. */
  priceString: string;
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
```

- [ ] **Step 5: Create the web/unavailable fallback**

```ts
// lib/purchases.ts
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
```

- [ ] **Step 6: Create the native implementation**

```ts
// lib/purchases.native.ts
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
```

- [ ] **Step 7: Add env keys to `.env.example`** (append; do NOT touch `.env`)

```
# RevenueCat public SDK keys (Project settings → API keys). Purchases are
# hidden when unset. Requires a dev build — see AGENTS.md.
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=
EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=
```

- [ ] **Step 8: Run tests + typecheck**

Run: `npm test -- lib/__tests__/purchases.test.ts` — Expected: PASS.
Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json lib/purchasesTypes.ts lib/purchases.ts lib/purchases.native.ts lib/__tests__/purchases.test.ts .env.example
git commit -m "Wrap react-native-purchases behind a native-module probe"
```

---

### Task 5: PlanContext + provider wiring

**Files:**
- Create: `contexts/PlanContext.tsx`
- Modify: `lib/types.ts`, `app/_layout.tsx`

- [ ] **Step 1: Extend `AppUser`** — in `lib/types.ts` replace the `AppUser` interface:

```ts
export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  themePreference: 'system' | 'light' | 'dark';
  /** Display-only mirror of the store entitlement (see PlanContext). */
  premium?: boolean;
  /** Over-cap pick: which lists stay editable on the free plan. */
  activeListIds?: string[];
}
```

- [ ] **Step 2: Create the context**

```tsx
// contexts/PlanContext.tsx
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { resolvePlan, type Plan, type PlanSource } from '@/lib/plan';
import { subscribeToPremiumGrant } from '@/lib/premiumGrants';
import {
  configurePurchases,
  isPurchasesAvailable,
  setPurchasesUser,
  subscribeToEntitlement,
} from '@/lib/purchases';
import {
  INACTIVE_ENTITLEMENT,
  type EntitlementSnapshot,
} from '@/lib/purchasesTypes';

type PlanContextValue = {
  plan: Plan;
  planSource: PlanSource;
  /** False until entitlement + user doc have loaded — gate banners on this. */
  planReady: boolean;
  purchasesAvailable: boolean;
  entitlement: EntitlementSnapshot;
  /** Over-cap pick (users/{uid}.activeListIds). Empty when unset. */
  activeListIds: string[];
  setActiveListIds: (ids: string[]) => Promise<void>;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const purchasesAvailable = isPurchasesAvailable();

  const [entitlement, setEntitlement] = useState(INACTIVE_ENTITLEMENT);
  const [entitlementLoaded, setEntitlementLoaded] = useState(!purchasesAvailable);
  // logIn(uid) must complete before we trust (or mirror) entitlement state,
  // otherwise the anonymous user's empty entitlements leak through.
  const [identityReady, setIdentityReady] = useState(false);
  const [compActive, setCompActive] = useState(false);
  const [mirroredPremium, setMirroredPremium] = useState(false);
  const [activeListIds, setActiveListIdsState] = useState<string[]>([]);
  const [userDocLoaded, setUserDocLoaded] = useState(false);

  useEffect(() => {
    configurePurchases();
    return subscribeToEntitlement((snapshot) => {
      setEntitlement(snapshot);
      setEntitlementLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    setIdentityReady(false);
    let active = true;
    void setPurchasesUser(user?.uid ?? null).finally(() => {
      if (active) {
        setIdentityReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (!user?.email) {
      setCompActive(false);
      return;
    }
    return subscribeToPremiumGrant(user.email, setCompActive);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMirroredPremium(false);
      setActiveListIdsState([]);
      setUserDocLoaded(false);
      return;
    }

    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        const data = snapshot.data();
        setMirroredPremium(Boolean(data?.premium));
        setActiveListIdsState(
          Array.isArray(data?.activeListIds) ? (data.activeListIds as string[]) : [],
        );
        setUserDocLoaded(true);
      },
      () => setUserDocLoaded(true),
    );
  }, [user]);

  // On devices with the SDK, RevenueCat's server-validated state is the truth.
  // Elsewhere (web, Expo Go) fall back to the display mirror.
  const storeActive = purchasesAvailable
    ? entitlement.premium
    : mirroredPremium;
  const { plan, planSource } = resolvePlan(Boolean(user) && storeActive, Boolean(user) && compActive);

  // Mirror the store entitlement to users/{uid} so web and other read-only
  // surfaces can display it. Display-only; RevenueCat remains the truth.
  useEffect(() => {
    if (!user || !purchasesAvailable || !entitlementLoaded || !identityReady || !userDocLoaded) {
      return;
    }
    if (mirroredPremium === entitlement.premium) {
      return;
    }

    void setDoc(
      doc(db, 'users', user.uid),
      { premium: entitlement.premium },
      { merge: true },
    ).catch((error) => console.warn('[plan] failed to mirror premium flag', error));
  }, [
    entitlement.premium,
    entitlementLoaded,
    identityReady,
    mirroredPremium,
    purchasesAvailable,
    user,
    userDocLoaded,
  ]);

  const setActiveListIds = useCallback(
    async (ids: string[]) => {
      if (!user) {
        return;
      }
      await setDoc(
        doc(db, 'users', user.uid),
        { activeListIds: ids },
        { merge: true },
      );
    },
    [user],
  );

  const planReady =
    !authLoading &&
    (!user || userDocLoaded) &&
    (!purchasesAvailable || (entitlementLoaded && identityReady));

  const value = useMemo(
    () => ({
      plan,
      planSource,
      planReady,
      purchasesAvailable,
      entitlement,
      activeListIds,
      setActiveListIds,
    }),
    [activeListIds, entitlement, plan, planReady, planSource, purchasesAvailable, setActiveListIds],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within PlanProvider');
  }
  return context;
}
```

- [ ] **Step 3: Mount the provider** — in `app/_layout.tsx`:

Add the import:
```tsx
import { PlanProvider } from '@/contexts/PlanContext';
```
Wrap directly inside `<AuthProvider>` (line 158): change
```tsx
        <AuthProvider>
          <ThemeProvider>
```
to
```tsx
        <AuthProvider>
          <PlanProvider>
          <ThemeProvider>
```
and the closing side (lines 177-179) from
```tsx
            <AppAlertHost />
          </ThemeProvider>
        </AuthProvider>
```
to
```tsx
            <AppAlertHost />
          </ThemeProvider>
          </PlanProvider>
        </AuthProvider>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — Expected: clean.
Run: `npm test` — Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add contexts/PlanContext.tsx lib/types.ts app/_layout.tsx
git commit -m "Add PlanContext merging store, comp, and mirrored premium state"
```

---

### Task 6: Choose-plan screen + signup entry rewiring

**Files:**
- Modify: `lib/authRedirect.ts`, `app/(auth)/_layout.tsx`, `app/(auth)/sign-in.tsx`, `app/index.tsx` (nav only), `app/settings/index.tsx` (nav only)
- Create: `app/(auth)/choose-plan.tsx`

- [ ] **Step 1: Add the chooser href helper** — append to `lib/authRedirect.ts`:

```ts
/**
 * Sign-up entry point. The chooser screen itself falls back to the plain
 * sign-up form when purchases are unavailable (web, Expo Go).
 */
export function buildPlanChooserHref(redirect?: string): Href {
  if (redirect) {
    return { pathname: '/(auth)/choose-plan', params: { redirect } };
  }

  return '/(auth)/choose-plan';
}
```

- [ ] **Step 2: Register the new screens** — replace `app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="choose-plan" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="paywall" />
    </Stack>
  );
}
```

- [ ] **Step 3: Create the chooser screen**

```tsx
// app/(auth)/choose-plan.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/lib/appName';
import { buildAuthHref, parseAuthRedirect } from '@/lib/authRedirect';
import { FREE_LIST_LIMIT } from '@/lib/listLimits';
import { getPremiumPackages, isPurchasesAvailable } from '@/lib/purchases';

type TierFeature = { icon: keyof typeof MaterialIcons.glyphMap; text: string };

const FREE_FEATURES: TierFeature[] = [
  { icon: 'sync', text: 'Sync your lists across devices' },
  { icon: 'group-add', text: 'Invite others to collaborate' },
  { icon: 'playlist-add-check', text: `Up to ${FREE_LIST_LIMIT} lists` },
];

const PREMIUM_FEATURES: TierFeature[] = [
  { icon: 'all-inclusive', text: 'Unlimited lists' },
  { icon: 'check', text: 'Everything in Free' },
];

export default function ChoosePlanScreen() {
  const { colors, radii, spacing } = useTheme();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const resolvedRedirect = parseAuthRedirect(redirect);
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);

  // Web / Expo Go: no purchases — go straight to the plain sign-up form.
  useEffect(() => {
    if (!isPurchasesAvailable()) {
      router.replace(buildAuthHref('sign-up', resolvedRedirect));
    }
  }, [resolvedRedirect]);

  useEffect(() => {
    let active = true;
    void getPremiumPackages().then((packages) => {
      const monthly = packages.find((pkg) => pkg.period === 'monthly');
      if (active && monthly) {
        setMonthlyPrice(monthly.priceString);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const continueWith = (plan: 'free' | 'premium') => {
    router.replace({
      pathname: '/(auth)/sign-up',
      params: {
        ...(resolvedRedirect ? { redirect: resolvedRedirect } : {}),
        ...(plan === 'premium' ? { plan: 'premium' } : {}),
      },
    });
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const renderCard = (
    title: string,
    priceLine: string,
    features: TierFeature[],
    plan: 'free' | 'premium',
    highlighted: boolean,
  ) => (
    <Pressable
      accessibilityLabel={`Choose the ${title} plan`}
      accessibilityRole="button"
      onPress={() => continueWith(plan)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: highlighted ? colors.accent : colors.border,
          borderRadius: radii.card,
          borderWidth: highlighted ? 2 : 1,
          gap: spacing.sm,
          opacity: pressed ? 0.85 : 1,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardPrice, { color: colors.textSecondary }]}>
          {priceLine}
        </Text>
      </View>
      {features.map((feature) => (
        <View key={feature.text} style={styles.featureRow}>
          <MaterialIcons color={colors.accent} name={feature.icon} size={20} />
          <Text style={[styles.featureText, { color: colors.text }]}>
            {feature.text}
          </Text>
        </View>
      ))}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.topHeader,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleGoBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialIcons color={colors.accent} name="chevron-left" size={24} />
        </Pressable>
      </View>

      <View style={[styles.container, { padding: spacing.lg, gap: spacing.md }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Join {APP_NAME}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Pick a plan to get started
          </Text>
        </View>

        {renderCard('Free', 'No cost', FREE_FEATURES, 'free', false)}
        {renderCard(
          'Premium',
          monthlyPrice ? `From ${monthlyPrice}/month` : 'Monthly or annual',
          PREMIUM_FEATURES,
          'premium',
          true,
        )}

        <Text style={[styles.footnote, { color: colors.textSecondary }]}>
          You can change plans anytime in Settings.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topHeader: { alignItems: 'flex-start' },
  backButton: {
    alignItems: 'center',
    borderRadius: 22,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  container: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
  },
  header: { alignItems: 'center', marginBottom: 8 },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  card: {},
  cardHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
  },
  cardPrice: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
```

- [ ] **Step 4: Point sign-up entry points at the chooser**

In `app/index.tsx`: change the import at line 30 to
```ts
import { buildPlanChooserHref } from '@/lib/authRedirect';
```
and `handlePromptSignIn` (line 154-157) to
```ts
  const handlePromptSignIn = useCallback(() => {
    dismissPrompt();
    router.push(buildPlanChooserHref());
  }, [dismissPrompt]);
```

In `app/settings/index.tsx`: the "Create account" Pressable (line 303-309) becomes
```tsx
              <Pressable
                onPress={() => router.push(buildPlanChooserHref('/'))}
```
with the import added alongside the existing buttonStyles import:
```ts
import { buildPlanChooserHref } from '@/lib/authRedirect';
```

In `app/(auth)/sign-in.tsx`: switching to sign-up should pass through the chooser. Change `handleSwitchMode` (line 40-42) to:
```ts
  const handleSwitchMode = (mode: AuthJourneyMode) => {
    if (mode === 'sign-up') {
      router.replace(buildPlanChooserHref(resolvedRedirect));
      return;
    }
    router.replace(buildAuthHref('sign-in', resolvedRedirect));
  };
```
and extend its authRedirect import to include `buildPlanChooserHref`.

(`app/(auth)/sign-up.tsx`'s own `handleSwitchMode` stays as-is: switching sign-up→sign-in keeps the plain flow, and its plan param is intentionally dropped.)

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` — Expected: clean.
Run: `npm test` — Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add lib/authRedirect.ts "app/(auth)/_layout.tsx" "app/(auth)/choose-plan.tsx" "app/(auth)/sign-in.tsx" app/index.tsx app/settings/index.tsx
git commit -m "Add free/premium chooser screen as the sign-up entry point"
```

---

### Task 7: Paywall screen + premium signup hand-off

**Files:**
- Create: `app/(auth)/paywall.tsx`
- Modify: `app/(auth)/sign-up.tsx`

- [ ] **Step 1: Create the paywall screen**

```tsx
// app/(auth)/paywall.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/Button';
import { usePlan } from '@/contexts/PlanContext';
import { useTheme } from '@/contexts/ThemeContext';
import { showAppAlert } from '@/lib/appAlert';
import { parseAuthRedirect } from '@/lib/authRedirect';
import { navigateAfterSignIn } from '@/lib/postAuthNavigation';
import {
  getPremiumPackages,
  purchasePremiumPackage,
  restorePremiumPurchases,
} from '@/lib/purchases';
import type { PremiumPackage } from '@/lib/purchasesTypes';

const PERIOD_LABEL: Record<PremiumPackage['period'], string> = {
  monthly: 'Monthly',
  annual: 'Annual',
  other: 'Other',
};

export default function PaywallScreen() {
  const { colors, radii, spacing } = useTheme();
  const { plan } = usePlan();
  const params = useLocalSearchParams<{ redirect?: string; from?: string }>();
  const resolvedRedirect = parseAuthRedirect(params.redirect);
  const fromSettings = params.from === 'settings';

  const [packages, setPackages] = useState<PremiumPackage[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);

  const finish = () => {
    if (fromSettings && router.canGoBack()) {
      router.back();
      return;
    }
    void navigateAfterSignIn(resolvedRedirect);
  };

  // Already premium (e.g. a comped account mid-signup, or a completed
  // purchase): nothing to sell — continue.
  useEffect(() => {
    if (plan === 'premium' && busy === null) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  useEffect(() => {
    let active = true;
    void getPremiumPackages().then((available) => {
      if (!active) {
        return;
      }
      setPackages(available);
      const annual = available.find((pkg) => pkg.period === 'annual');
      setSelectedId((annual ?? available[0])?.identifier ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const handlePurchase = async () => {
    if (!selectedId) {
      return;
    }
    setBusy('purchase');
    try {
      const outcome = await purchasePremiumPackage(selectedId);
      if (outcome === 'purchased') {
        finish();
      }
    } catch {
      showAppAlert('Purchase failed', 'Nothing was charged. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    setBusy('restore');
    try {
      const restored = await restorePremiumPurchases();
      if (restored) {
        finish();
      } else {
        showAppAlert('Nothing to restore', 'No previous Premium purchase was found for this store account.');
      }
    } catch {
      showAppAlert('Restore failed', 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { padding: spacing.lg, gap: spacing.md }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Go Premium</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Unlimited lists. Cancel anytime.
          </Text>
        </View>

        {packages === null ? (
          <ActivityIndicator color={colors.accent} size="large" />
        ) : packages.length === 0 ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Plans aren't available right now. Please try again later.
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {packages.map((pkg) => {
              const selected = pkg.identifier === selectedId;
              return (
                <Pressable
                  key={pkg.identifier}
                  accessibilityLabel={`${PERIOD_LABEL[pkg.period]} plan, ${pkg.priceString}`}
                  accessibilityRole="button"
                  disabled={busy !== null}
                  onPress={() => setSelectedId(pkg.identifier)}
                  style={({ pressed }) => [
                    styles.packageRow,
                    {
                      backgroundColor: selected ? colors.accentSoft : colors.surface,
                      borderColor: selected ? colors.accent : colors.border,
                      borderRadius: radii.item,
                      opacity: pressed ? 0.85 : 1,
                      padding: spacing.md,
                    },
                  ]}
                >
                  <Text style={[styles.packageLabel, { color: colors.text }]}>
                    {PERIOD_LABEL[pkg.period]}
                  </Text>
                  <Text style={[styles.packagePrice, { color: colors.text }]}>
                    {pkg.priceString}
                    <Text style={{ color: colors.textSecondary }}>
                      {pkg.period === 'annual' ? ' / year' : pkg.period === 'monthly' ? ' / month' : ''}
                    </Text>
                  </Text>
                  {selected ? (
                    <MaterialIcons color={colors.accent} name="check-circle" size={22} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          {packages !== null && packages.length > 0 ? (
            <Button
              label={busy === 'purchase' ? 'Processing…' : 'Subscribe'}
              onPress={() => void handlePurchase()}
              variant="primary"
            />
          ) : null}
          <Button
            label={fromSettings ? 'Cancel' : 'Not now — start with Free'}
            onPress={finish}
            variant="ghost"
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={() => void handleRestore()}
            style={styles.restoreButton}
          >
            {busy === 'restore' ? (
              <ActivityIndicator color={colors.textSecondary} size="small" />
            ) : (
              <Text style={[styles.restoreText, { color: colors.accent }]}>
                Restore purchases
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={[styles.legal, { color: colors.textSecondary }]}>
          Subscriptions renew automatically until cancelled in your app store
          settings. Prices are shown in your local currency.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
  },
  header: { alignItems: 'center' },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  packageRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  packageLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
  packagePrice: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    textAlign: 'right',
  },
  restoreButton: {
    alignItems: 'center',
    minHeight: 32,
    justifyContent: 'center',
  },
  restoreText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
  },
  legal: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Hand off to the paywall after premium signup** — in `app/(auth)/sign-up.tsx`:

Extend the params read (line 28) to:
```ts
  const { redirect, plan } = useLocalSearchParams<{ redirect?: string; plan?: string }>();
```
Add below `resolvedRedirect`:
```ts
  const wantsPremium = plan === 'premium';
```
Add the import:
```ts
import { isPurchasesAvailable } from '@/lib/purchases';
```
Change the `AuthJourney` `onAuthenticated` prop (line 85) to:
```tsx
              onAuthenticated={() => {
                if (wantsPremium && isPurchasesAvailable()) {
                  router.replace({
                    pathname: '/(auth)/paywall',
                    params: resolvedRedirect ? { redirect: resolvedRedirect } : {},
                  });
                  return;
                }
                return navigateAfterSignIn(resolvedRedirect);
              }}
```
(The paywall itself skips ahead when the account is already premium — comped emails never see the purchase sheet.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/paywall.tsx" "app/(auth)/sign-up.tsx"
git commit -m "Add paywall screen and premium hand-off after signup"
```

---

### Task 8: Benefits modal extraction + signed-in create gate

**Files:**
- Create: `components/BenefitsModal.tsx`, `components/UpgradePromptModal.tsx`
- Modify: `components/SignInBenefitsModal.tsx`, `app/index.tsx`

- [ ] **Step 1: Extract the generalized modal** — create `components/BenefitsModal.tsx` by generalizing `components/SignInBenefitsModal.tsx`. Copy that file's entire contents, then:

1. Rename the component and props type:
```tsx
export type BenefitItem = {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
};

type BenefitsModalProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  benefits: BenefitItem[];
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onDismiss: () => void;
};

export default function BenefitsModal({
  visible,
  title,
  subtitle,
  benefits,
  primaryLabel,
  secondaryLabel = 'Maybe later',
  onPrimary,
  onDismiss,
}: BenefitsModalProps) {
```
2. Delete the module-level `Benefit` type and `BENEFITS` constant.
3. In the JSX, `BENEFITS.map` becomes `benefits.map`, and the button group becomes:
```tsx
        <View style={styles.buttonGroup}>
          <Button label={primaryLabel} onPress={onPrimary} variant="primary" />
          <Button label={secondaryLabel} onPress={onDismiss} variant="ghost" />
        </View>
```
Everything else (animation, backdrop, BackHandler, styles) stays identical.

- [ ] **Step 2: Rebase SignInBenefitsModal on it** — replace `components/SignInBenefitsModal.tsx` with:

```tsx
import BenefitsModal, { type BenefitItem } from '@/components/BenefitsModal';

// Signing up no longer unlocks extra lists (the free plan keeps the same
// 2-list cap) — the pitch is sync/share, with Premium for unlimited.
const BENEFITS: BenefitItem[] = [
  { icon: 'sync', text: 'Sync your lists across devices' },
  { icon: 'group-add', text: 'Invite others to collaborate' },
  { icon: 'workspace-premium', text: 'Go Premium for unlimited lists' },
];

type SignInBenefitsModalProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  onSignIn: () => void;
  onDismiss: () => void;
};

export default function SignInBenefitsModal({
  visible,
  title,
  subtitle,
  onSignIn,
  onDismiss,
}: SignInBenefitsModalProps) {
  return (
    <BenefitsModal
      benefits={BENEFITS}
      onDismiss={onDismiss}
      onPrimary={onSignIn}
      primaryLabel="Log in or sign up"
      subtitle={subtitle}
      title={title}
      visible={visible}
    />
  );
}
```

- [ ] **Step 3: Create the upgrade prompt**

```tsx
// components/UpgradePromptModal.tsx
import BenefitsModal, { type BenefitItem } from '@/components/BenefitsModal';
import { FREE_LIST_LIMIT } from '@/lib/listLimits';

const BENEFITS: BenefitItem[] = [
  { icon: 'all-inclusive', text: 'Unlimited lists' },
  { icon: 'sync', text: 'Everything in Free, no limits' },
];

type UpgradePromptModalProps = {
  visible: boolean;
  /** False on web/Expo Go, where the purchase can't happen on this device. */
  purchasesAvailable: boolean;
  onUpgrade: () => void;
  onDismiss: () => void;
};

export default function UpgradePromptModal({
  visible,
  purchasesAvailable,
  onUpgrade,
  onDismiss,
}: UpgradePromptModalProps) {
  return (
    <BenefitsModal
      benefits={BENEFITS}
      onDismiss={onDismiss}
      onPrimary={purchasesAvailable ? onUpgrade : onDismiss}
      primaryLabel={purchasesAvailable ? 'Upgrade to Premium' : 'Got it'}
      subtitle={
        purchasesAvailable
          ? `The Free plan includes ${FREE_LIST_LIMIT} lists (yours and shared ones). Go Premium for unlimited:`
          : `The Free plan includes ${FREE_LIST_LIMIT} lists. Upgrade from the mobile app to unlock unlimited lists.`
      }
      title="Create more lists"
      visible={visible}
    />
  );
}
```

- [ ] **Step 4: Gate creation on the home screen** — in `app/index.tsx`:

Add imports:
```ts
import UpgradePromptModal from '@/components/UpgradePromptModal';
import { usePlan } from '@/contexts/PlanContext';
import { canCreateList, FREE_LIST_LIMIT, isAtFreeListLimit } from '@/lib/listLimits';
```
(replacing the existing listLimits import at line 36).

Inside the component, after `const { lists, loading, createList } = useLists();` add:
```ts
  const { plan, purchasesAvailable } = usePlan();
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
```
Replace `openCreateModal` (lines 132-142) with:
```ts
  const openCreateModal = useCallback(() => {
    // Single enforcement point for the free-tier cap. Signed-out users get
    // the sign-in pitch; signed-in free users at the cap get the premium one.
    if (!user && isAtFreeListLimit(lists.length)) {
      setLimitPromptVisible(true);
      return;
    }
    if (user && !canCreateList(plan, lists.length)) {
      setUpgradePromptVisible(true);
      return;
    }

    setError(null);
    setModalVisible(true);
  }, [lists.length, plan, user]);
```
Add a handler next to `handlePromptSignIn`:
```ts
  const handleUpgrade = useCallback(() => {
    setUpgradePromptVisible(false);
    router.push({ pathname: '/(auth)/paywall', params: { from: 'settings' } });
  }, []);
```
And render, directly after the existing `<SignInBenefitsModal … />`:
```tsx
      <UpgradePromptModal
        onDismiss={() => setUpgradePromptVisible(false)}
        onUpgrade={handleUpgrade}
        purchasesAvailable={purchasesAvailable}
        visible={upgradePromptVisible}
      />
```
The signed-out limit prompt copy at line 347 needs no change — its benefit rows were already corrected in Step 2 (the old "Create more than 2 lists" bullet is gone).

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` and `npm test` — Expected: clean / all pass.

- [ ] **Step 6: Commit**

```bash
git add components/BenefitsModal.tsx components/SignInBenefitsModal.tsx components/UpgradePromptModal.tsx app/index.tsx
git commit -m "Gate list creation for signed-in free users with an upgrade prompt"
```

---

### Task 9: Join gate

**Files:**
- Modify: `app/join/[listId].tsx`

- [ ] **Step 1: Block joins at the cap** — in `app/join/[listId].tsx`:

Add imports:
```ts
import Button from '@/components/Button';
import { usePlan } from '@/contexts/PlanContext';
import { useLists } from '@/hooks/useLists';
import { canJoinList } from '@/lib/listLimits';
```
Inside the component add:
```ts
  const { plan, planReady, purchasesAvailable } = usePlan();
  const { lists, loading: listsLoading } = useLists();
  const [blocked, setBlocked] = useState(false);
```
Replace the joining effect (lines 33-66) with:
```ts
  useEffect(() => {
    if (authLoading || joining || showAppLanding || blocked) {
      return;
    }

    if (!resolvedListId) {
      setError('Invalid invite link.');
      return;
    }

    if (!user) {
      router.replace({
        pathname: '/(auth)/sign-in',
        params: { redirect: `/join/${resolvedListId}` },
      });
      return;
    }

    // Wait for plan + memberships so the cap check sees real data.
    if (!planReady || listsLoading) {
      return;
    }

    const alreadyMember = lists.some((list) => list.id === resolvedListId);
    if (!alreadyMember && !canJoinList(plan, lists.length)) {
      setBlocked(true);
      return;
    }

    setJoining(true);
    setError(null);

    joinList(resolvedListId, user.uid)
      .then(async () => {
        await clearPendingInviteListId();
        router.replace({
          pathname: '/list/[id]',
          params: { id: resolvedListId },
        });
      })
      .catch(() => {
        setError('Could not join this list. It may not exist or you may not have access.');
        setJoining(false);
      });
  }, [
    authLoading,
    blocked,
    joining,
    lists,
    listsLoading,
    plan,
    planReady,
    resolvedListId,
    showAppLanding,
    user,
  ]);
```
And render the blocked state — inside the final `return`, replace the `<View style={[styles.container, ...]}>` contents with:
```tsx
        {blocked ? (
          <>
            <Text style={[styles.message, { color: colors.text }]}>
              You've reached the Free plan's list limit, so this invite can't be
              accepted yet. Go Premium for unlimited lists, or leave one of your
              current lists first.
            </Text>
            {purchasesAvailable ? (
              <Button
                label="Upgrade to Premium"
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/paywall',
                    params: { redirect: `/join/${resolvedListId}` },
                  })
                }
                variant="primary"
              />
            ) : null}
            <Button
              label="Back to my lists"
              onPress={() => router.replace('/')}
              variant="ghost"
            />
          </>
        ) : error ? (
          <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
        ) : (
          <ActivityIndicator color={colors.accent} size="large" />
        )}
        {!error && !blocked ? (
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Joining list...
          </Text>
        ) : null}
```
(The paywall's `redirect` back to `/join/…` retries the join after a successful upgrade.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/join/[listId].tsx"
git commit -m "Block joining shared lists past the free cap with an upgrade path"
```

---

### Task 10: Read-only over-cap lists

**Files:**
- Create: `hooks/useListAccess.ts`
- Modify: `app/list/[id]/index.tsx`, `components/ListCard.tsx`, `app/index.tsx`

- [ ] **Step 1: Create the access hook**

```ts
// hooks/useListAccess.ts
import { useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';
import { useLists } from '@/hooks/useLists';
import { isListEditable, resolveEditableListIds } from '@/lib/listLimits';
import { usesCloudListData } from '@/lib/listIds';

/**
 * Whether a list is read-only for the current user: free plan, over the cap
 * (post-downgrade), and this list isn't one of their picked editable lists.
 * Local lists and premium accounts are never read-only.
 */
export function useListAccess(listId: string | undefined): { readOnly: boolean } {
  const { user } = useAuth();
  const { plan, planReady, activeListIds } = usePlan();
  const { lists, loading } = useLists();

  return useMemo(() => {
    if (!user || !listId || !usesCloudListData(user, listId) || !planReady || loading) {
      return { readOnly: false };
    }

    const listIds = lists.map((list) => list.id);
    if (!listIds.includes(listId)) {
      return { readOnly: false };
    }

    const editable = resolveEditableListIds(plan, listIds, activeListIds);
    return { readOnly: !isListEditable(listId, editable) };
  }, [activeListIds, listId, lists, loading, plan, planReady, user]);
}
```

- [ ] **Step 2: Wire it into the list screen** — in `app/list/[id]/index.tsx`:

Add imports:
```ts
import { router } from 'expo-router';   // already imported — no change
import { useListAccess } from '@/hooks/useListAccess';
import { isPurchasesAvailable } from '@/lib/purchases';
```
After the `useListItems` destructure (line 92) add:
```ts
  const { readOnly } = useListAccess(listId);
```
Guard the mutating handlers — each gets a first-line guard:

In `handleRenameList` (line 399):
```ts
  const handleRenameList = () => {
    if (readOnly) {
      showReadOnlyNotice();
      return;
    }
    blurAddInput();
    setListOptionsVisible(false);
    setRenameError(null);
    setRenameModalVisible(true);
  };
```
In `handleClearList` (line 428), `handleShare` (line 354), and `handleMoveDoneToBottomChange` (line 479) add the same two lines at the top:
```ts
    if (readOnly) {
      showReadOnlyNotice();
      return;
    }
```
In `handleToggleItem` (line 604) and `handlePressItem` (line 590), add `if (readOnly) return;` as the first line, and add `readOnly` to each `useCallback` dependency array. (Delete and Leave stay allowed — they free slots.)

Define the notice helper next to `confirmDestructiveAction` (line 383):
```ts
  const showReadOnlyNotice = () => {
    showAppAlert(
      'This list is read-only',
      'The Free plan includes 2 editable lists. Upgrade to Premium, or delete/leave a list to free a slot.',
    );
  };
```
Disable drag reordering — line 862 (`disabled={lockListItems}`) becomes:
```tsx
            disabled={lockListItems || readOnly}
```
Replace the add-input row with a banner when read-only. Wrap the entire add-input `<Pressable nativeID={ADD_INPUT_ROW_NATIVE_ID} …>` block (lines 782-856) as:
```tsx
      {readOnly ? (
        <View
          style={[
            styles.readOnlyBanner,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radii.item,
              marginHorizontal: spacing.lg,
              marginTop: spacing.lg,
              padding: spacing.md,
            },
          ]}
        >
          <MaterialIcons color={colors.textSecondary} name="lock-outline" size={20} />
          <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
            Read-only on the Free plan
          </Text>
          {isPurchasesAvailable() ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() =>
                router.push({ pathname: '/(auth)/paywall', params: { from: 'settings' } })
              }
            >
              <Text style={[styles.readOnlyUpgrade, { color: colors.accent }]}>
                Upgrade
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable
          nativeID={ADD_INPUT_ROW_NATIVE_ID}
          … (existing add-input row block, unchanged) …
        </Pressable>
      )}
```
Add the styles to the StyleSheet:
```ts
  readOnlyBanner: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
  },
  readOnlyText: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  readOnlyUpgrade: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
```

- [ ] **Step 3: Lock badge on the home cards** — in `components/ListCard.tsx`:

Extend the props:
```ts
type ListCardProps = {
  list: AppList;
  countsRefreshKey?: number;
  locked?: boolean;
};

export default function ListCard({ list, countsRefreshKey = 0, locked = false }: ListCardProps) {
```
In the trailing meta view (line 49), before the shared icon:
```tsx
        <View style={styles.trailingMeta}>
          {locked ? (
            <View accessibilityLabel="Read-only list" style={styles.groupIcon}>
              <MaterialIcons color={colors.textSecondary} name="lock-outline" size={16} />
            </View>
          ) : null}
          {isShared ? (
```

- [ ] **Step 4: Pass `locked` from the home screen** — in `app/index.tsx`:

Extend the listLimits import with `resolveEditableListIds, isListEditable`, extend the usePlan destructure with `planReady, activeListIds`, and add below `sharedCount`:
```ts
  const editableListIds = useMemo(
    () =>
      user && planReady
        ? resolveEditableListIds(plan, lists.map((list) => list.id), activeListIds)
        : ('all' as const),
    [activeListIds, lists, plan, planReady, user],
  );
```
Change the `renderItem` (line 273-275) to:
```tsx
                renderItem={({ item }) => (
                  <ListCard
                    countsRefreshKey={countsRefreshKey}
                    list={item}
                    locked={!isListEditable(item.id, editableListIds)}
                  />
                )}
```

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit` and `npm test` — Expected: clean / all pass.

```bash
git add hooks/useListAccess.ts "app/list/[id]/index.tsx" components/ListCard.tsx app/index.tsx
git commit -m "Make over-cap lists read-only with banner, guards, and lock badges"
```

---

### Task 11: Over-cap "pick 2 lists" chooser

**Files:**
- Create: `components/ChooseEditableListsModal.tsx`
- Modify: `app/index.tsx`

- [ ] **Step 1: Create the chooser modal**

```tsx
// components/ChooseEditableListsModal.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import Button from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { FREE_LIST_LIMIT } from '@/lib/listLimits';
import { CONTENT_MAX_WIDTH } from '@/lib/slideTransition';
import type { AppList } from '@/lib/types';

type ChooseEditableListsModalProps = {
  visible: boolean;
  lists: AppList[];
  initialSelection: string[];
  onConfirm: (ids: string[]) => void | Promise<void>;
  onDismiss: () => void;
};

/**
 * Shown when a free account is over the list cap (after a downgrade): the
 * user picks which FREE_LIST_LIMIT lists stay editable; the rest go
 * read-only. Dismissing keeps everything read-only until they pick.
 */
export default function ChooseEditableListsModal({
  visible,
  lists,
  initialSelection,
  onConfirm,
  onDismiss,
}: ChooseEditableListsModalProps) {
  const { colors, radii, spacing } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [selected, setSelected] = useState<string[]>(initialSelection);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(initialSelection.filter((id) => lists.some((l) => l.id === id)));
    }
    // Re-seed only when (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((existing) => existing !== id);
      }
      if (current.length >= FREE_LIST_LIMIT) {
        // Replace the oldest pick so tapping always responds.
        return [...current.slice(1), id];
      }
      return [...current, id];
    });
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(selected);
    } finally {
      setSaving(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityViewIsModal
      style={[
        styles.shell,
        Platform.OS === 'web'
          ? ({ height: windowHeight, position: 'fixed' } as object)
          : null,
      ]}
    >
      <Pressable accessibilityLabel="Dismiss" onPress={onDismiss} style={styles.backdrop} />
      <View
        style={[
          styles.dialog,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            gap: spacing.md,
            padding: spacing.lg,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Pick {FREE_LIST_LIMIT} lists to keep editable
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            You're on the Free plan with more than {FREE_LIST_LIMIT} lists. The
            others stay safe but read-only until you upgrade or free a slot.
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          {lists.map((list) => {
            const isSelected = selected.includes(list.id);
            return (
              <Pressable
                key={list.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggle(list.id)}
                style={({ pressed }) => [
                  styles.listRow,
                  {
                    backgroundColor: isSelected ? colors.accentSoft : colors.surfaceMuted,
                    borderColor: isSelected ? colors.accent : colors.border,
                    borderRadius: radii.item,
                    opacity: pressed ? 0.85 : 1,
                    padding: spacing.md,
                  },
                ]}
              >
                <Text style={styles.listEmoji}>{list.emoji}</Text>
                <Text numberOfLines={1} style={[styles.listName, { color: colors.text }]}>
                  {list.name}
                </Text>
                <MaterialIcons
                  color={isSelected ? colors.accent : colors.textSecondary}
                  name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                  size={22}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.buttonGroup}>
          <Button
            disabled={selected.length !== FREE_LIST_LIMIT || saving}
            label={saving ? 'Saving…' : 'Keep these editable'}
            onPress={() => void handleConfirm()}
            variant="primary"
          />
          <Button label="Not now" onPress={onDismiss} variant="ghost" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 23, 0.35)',
  },
  dialog: {
    borderWidth: 1,
    maxWidth: CONTENT_MAX_WIDTH - 24,
    width: '100%',
    zIndex: 1,
  },
  header: { gap: 8 },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  listRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  listEmoji: { fontSize: 22, lineHeight: 26 },
  listName: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
  buttonGroup: { gap: 8 },
});
```

Note: `components/Button.tsx` must support a `disabled` prop — check its props first; if absent, add pass-through `disabled?: boolean` that disables the Pressable and drops opacity to 0.5.

- [ ] **Step 2: Show it on the home screen** — in `app/index.tsx`:

Add imports:
```ts
import ChooseEditableListsModal from '@/components/ChooseEditableListsModal';
import { needsEditableListPick } from '@/lib/listLimits';   // extend existing import
```
Extend the `usePlan()` destructure with `setActiveListIds`. Add below `editableListIds`:
```ts
  const [pickDismissed, setPickDismissed] = useState(false);
  const needsPick =
    Boolean(user) &&
    planReady &&
    !loading &&
    needsEditableListPick(plan, lists.map((list) => list.id), activeListIds);
```
Render after `<UpgradePromptModal … />`:
```tsx
      <ChooseEditableListsModal
        initialSelection={activeListIds}
        lists={lists}
        onConfirm={async (ids) => {
          await setActiveListIds(ids);
          setPickDismissed(false);
        }}
        onDismiss={() => setPickDismissed(true)}
        visible={needsPick && !pickDismissed}
      />
```
(Confirming writes `activeListIds`; the modal auto-hides because `needsPick` recomputes to false. `pickDismissed` resets naturally on next app launch.)

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` and `npm test` — Expected: clean / all pass.

```bash
git add components/ChooseEditableListsModal.tsx components/Button.tsx app/index.tsx
git commit -m "Add over-cap chooser for which lists stay editable"
```

---

### Task 12: Settings Plan section

**Files:**
- Modify: `app/settings/index.tsx`

- [ ] **Step 1: Add the Plan section** — in `app/settings/index.tsx`:

Add imports (`Linking` and `Platform` extend the existing `react-native` import list):
```ts
import { Linking, Platform } from 'react-native';
import { usePlan } from '@/contexts/PlanContext';
import { showAppAlert } from '@/lib/appAlert';
import { restorePremiumPurchases } from '@/lib/purchases';
```
Add a module-level constant (fallback when RevenueCat has no `managementURL` yet):
```ts
const STORE_SUBSCRIPTIONS_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
```
Inside the component add:
```ts
  const { plan, planSource, purchasesAvailable, entitlement } = usePlan();
  const [restoring, setRestoring] = useState(false);

  const handleManageSubscription = () => {
    void Linking.openURL(entitlement.managementURL ?? STORE_SUBSCRIPTIONS_URL);
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePremiumPurchases();
      showAppAlert(
        restored ? 'Premium restored' : 'Nothing to restore',
        restored
          ? 'Your Premium subscription is active on this device.'
          : 'No previous Premium purchase was found for this store account.',
      );
    } catch {
      showAppAlert('Restore failed', 'Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const renewalDate = entitlement.expirationDate
    ? new Date(entitlement.expirationDate).toLocaleDateString()
    : null;
```
Insert this section in the ScrollView, directly after the Account section's closing `</View>` (line 326) and before the intro image:
```tsx
        {user ? (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Plan</Text>

            <View style={[styles.planRow, { marginTop: spacing.sm }]}>
              <View
                style={[
                  styles.planBadge,
                  {
                    backgroundColor: plan === 'premium' ? colors.accentSoft : colors.surfaceMuted,
                    borderRadius: radii.checkbox,
                  },
                ]}
              >
                <Text style={[styles.planBadgeText, { color: colors.text }]}>
                  {plan === 'premium' ? 'Premium' : 'Free'}
                </Text>
              </View>
              <Text style={[styles.planDetail, { color: colors.textSecondary, flex: 1 }]}>
                {plan === 'premium'
                  ? planSource === 'comp'
                    ? 'Complimentary — enjoy!'
                    : renewalDate
                      ? entitlement.willRenew
                        ? `Renews ${renewalDate}`
                        : `Ends ${renewalDate}`
                      : 'Active subscription'
                  : 'Up to 2 lists'}
              </Text>
            </View>

            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {plan === 'free' && purchasesAvailable ? (
                <Button
                  label="Upgrade to Premium"
                  onPress={() =>
                    router.push({ pathname: '/(auth)/paywall', params: { from: 'settings' } })
                  }
                  variant="primary"
                />
              ) : null}
              {plan === 'free' && !purchasesAvailable ? (
                <Text style={[styles.planDetail, { color: colors.textSecondary }]}>
                  Upgrade from the List Kitty app on your phone to unlock
                  unlimited lists.
                </Text>
              ) : null}
              {plan === 'premium' && planSource === 'store' ? (
                <Button
                  label="Manage subscription"
                  onPress={handleManageSubscription}
                  variant="surface"
                />
              ) : null}
              {purchasesAvailable ? (
                <Button
                  label={restoring ? 'Restoring…' : 'Restore purchases'}
                  onPress={() => void handleRestore()}
                  variant="ghost"
                />
              ) : null}
            </View>
          </View>
        ) : null}
```
Add styles:
```ts
  planRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planBadgeText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  planDetail: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
```
("Manage subscription" opens the store's management page — the only
store-compliant cancel/downgrade path; access continues until the paid period
ends. Cancelling drops the entitlement at period end, and the over-cap
chooser/read-only flow from Tasks 10-11 takes over automatically.)

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit` and `npm test` — Expected: clean / all pass.

```bash
git add app/settings/index.tsx
git commit -m "Add Plan section to settings with upgrade, manage, and restore"
```

---

### Task 13: Documentation

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/premium-setup.md`

- [ ] **Step 1: AGENTS.md note** — append this section (mirroring the Google sign-in note's format):

```markdown
# Premium purchases only work in dev builds, not Expo Go or web

The Premium plan chooser/paywall rely on `react-native-purchases` (RevenueCat),
which Expo Go does not include. `isPurchasesAvailable()` in
`lib/purchases.native.ts` probes for the `RNPurchases` native module (same
pattern as Google sign-in) and returns `false` when it is absent or when the
`EXPO_PUBLIC_REVENUECAT_*_KEY` env vars are unset — the signup flow then skips
the plan chooser entirely. The web build never sells: it displays premium
status from the `users/{uid}.premium` mirror and comp grants only.

Complimentary premium: add a doc whose ID is the (lowercased) email under the
`premiumGrants` Firestore collection in the Firebase console. See
`docs/premium-setup.md`.
```

- [ ] **Step 2: Create `docs/premium-setup.md`**

```markdown
# Premium setup (one-time console work)

Code ships without any of this, but real purchases need it all.

## App Store Connect (iOS)
1. Create a subscription group "Premium".
2. Add two auto-renewing subscriptions: monthly and annual. Set prices here —
   never in code.
3. Fill in the required subscription metadata + review screenshot.

## Google Play Console (Android)
1. Monetize → Subscriptions → create one subscription "Premium".
2. Add two base plans: `monthly` and `annual`, with prices.
3. Purchases need a build on a testing track (internal is fine) at least once.

## RevenueCat
1. Create a project; add both the App Store and Play Store apps.
2. Entitlements: create one with the identifier `premium` (must match
   `ENTITLEMENT_ID` in `lib/purchases.native.ts`).
3. Products: import the store products; attach all of them to the `premium`
   entitlement.
4. Offerings: the `default` offering gets a monthly and an annual package.
5. Copy the public SDK keys (Apple + Google) into `.env`:
   `EXPO_PUBLIC_REVENUECAT_APPLE_KEY`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`.
6. Rebuild dev clients (`npx expo run:android` / `run:ios`).

## Complimentary premium (friends, family, testing)
Firebase console → Firestore → `premiumGrants` collection → Add document:
- Document ID: the person's sign-in email, **lowercased** (Apple
  "Hide My Email" users: use the relay address they sign in with).
- Fields: optional, e.g. `note: "Mum"`, `createdAt: <today>`.

Delete the doc to revoke. Both apply live in the app. Comped users skip the
paywall and see "Premium — Complimentary" in Settings.

## Testing purchases
Sandbox purchases require a dev build signed appropriately: use App Store
sandbox testers (iOS) or a Play internal-testing install (Android). Expo Go
and web intentionally hide all purchase UI.
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md docs/premium-setup.md
git commit -m "Document premium store setup and comp grants"
```

---

### Task 14: Full verification

- [ ] **Step 1: Full test suite + typecheck**

Run: `npm test` — Expected: all suites pass.
Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 2: Web smoke test** (purchases-unavailable path)

Run: `npx expo start --web`, then verify:
1. Sign-up entry → lands directly on the sign-up form (chooser skipped).
2. Settings (signed in) shows the Plan section with the "upgrade from the
   mobile app" note, no paywall buttons.
3. No console errors mentioning `react-native-purchases` / `RNPurchases`.

- [ ] **Step 3: Manual device checklist** (requires dev build + store setup — record what was and wasn't run in the final report)

1. Sign-up → chooser shows Free + Premium with a live price.
2. Premium → account → paywall → cancel purchase sheet → lands signed-in on Free.
3. Paywall purchase with a sandbox account → premium in Settings; create a 3rd list.
4. Comp grant doc for a test email → that account skips the paywall, shows
   "Complimentary", can create unlimited lists, works in Expo Go too.
5. Cancel sandbox sub (or revoke comp with >2 lists) → chooser modal appears,
   picked lists editable, others read-only with lock badges and banner;
   delete one list → slot frees.
6. Invite a free at-cap account → join blocked with upgrade path.
7. Restore purchases on a reinstalled build → premium returns.

- [ ] **Step 4: Commit any fixes, then report**

Summarize: tests run, what was verified where (Jest / web / device), and the
outstanding console prerequisites from `docs/premium-setup.md`.
