# Monetization: Free/Premium tiers at signup

**Date:** 2026-07-05
**Status:** Approved (design review complete)
**Branch:** monetisation

## Summary

Add a plan choice to the signup flow. **Free** accounts get sync and sharing but
may create or contribute to at most **2 lists** (owned + joined combined).
**Premium** accounts get unlimited lists via an auto-renewing subscription
(monthly or annual) sold through Apple/Google in-app purchase, managed by
RevenueCat. Settings gains a Plan section for upgrading, managing/cancelling,
and restoring purchases.

## Decisions made during design review

| Question | Decision |
| --- | --- |
| Billing model | Monthly + annual auto-renewing subscription |
| Payment integration | RevenueCat (`react-native-purchases`) |
| Downgrade with >2 lists | Extra lists become read-only; data never deleted |
| Which 2 stay editable when over cap | **User picks** (stored as `activeListIds` on the user doc) |
| Web purchases | Mobile-only for now; web shows status + "subscribe on mobile" notice |
| Cap enforcement | Client-side only; premium status is server-validated by RevenueCat. Firestore-rules enforcement is a documented follow-up, not in scope |
| Signup flow order | Choose plan → create account → paywall (purchase tied to Firebase uid) |
| Complimentary premium | Owner-managed Firestore allowlist keyed by email (`premiumGrants/{email}`), edited in the Firebase console — no deploy needed. Chosen over RevenueCat promotional entitlements, which can't target an email before the user exists |

## Architecture

### Entitlements layer

- `lib/purchases.native.ts` + `lib/purchases.ts` (web/Expo Go fallback), following
  the `lib/socialAuth.native.ts` module-probe pattern: detect whether the
  `react-native-purchases` native module is present at runtime; when absent
  (Expo Go, web), report purchases unavailable and never crash.
- On Firebase sign-in: `Purchases.logIn(uid)`; on sign-out: `Purchases.logOut()`.
  Subscriptions are keyed to the Firebase account — cross-device and
  reinstall-safe.
- A `usePlan()` hook (small context provider) exposes:
  - `plan: 'free' | 'premium'`
  - `purchasesAvailable: boolean`
  - `packages` (monthly/annual offering, localized prices from the store)
  - `purchase(pkg)`, `restore()`, `managementURL`
- After each entitlement refresh, the client mirrors `premium: boolean` to its
  own `users/{uid}` doc. The mirror is **display-only** (web build, cross-user
  UI); the source of truth is RevenueCat's server-validated entitlement. The
  mirror reflects the **store** entitlement only — comp grants are resolved
  live from `premiumGrants` on every platform and never need mirroring.
- Entitlement id in RevenueCat: `premium`.
- **Plan resolution:** `premium = store entitlement (RevenueCat) OR comp grant
  (Firestore allowlist)`. `usePlan()` also exposes
  `planSource: 'store' | 'comp' | null` so the UI can distinguish paid from
  complimentary (store wins when both apply, so subscription management stays
  visible).

### Complimentary premium (owner grants)

- Collection `premiumGrants/{email}` — doc ID is the **lowercased** email;
  fields are informational only (`note`, `createdAt`); the doc's existence is
  the grant. Optional expiry is out of scope.
- Written **only** from the Firebase console (or Admin SDK) by the owner.
  Security rules allow no client writes and allow `get` only when
  `request.auth.token.email.lower() == email` — a user can check their own
  grant and nobody can enumerate the list.
- The client subscribes to its own grant doc after sign-in, so grants and
  revocations apply live without a reinstall or new release.
- Comped users skip the paywall everywhere — including the premium branch of
  signup (the post-account-creation step checks the resolved plan before
  showing the paywall).
- Works on web and in Expo Go too, since it's a plain Firestore read — comped
  testers get premium even where the purchase SDK is unavailable.
- Caveats (documented for the owner): grants match the exact sign-in email, so
  Apple "Hide My Email" relay addresses must be comped as the relay address;
  email ownership is not re-verified (an unverified email/password account
  claiming a comped address is accepted) — acceptable risk for a
  friends-and-family list, revisit if grants ever carry real value.

### Data model (`users/{uid}`)

- `premium: boolean` — display mirror (see above).
- `activeListIds: string[]` — the lists a free over-cap user picked to keep
  editable. Only meaningful while `membership count > 2` and not premium.
- `AppUser` type in `lib/types.ts` extended accordingly.

### Cap semantics (`lib/listLimits.ts` extended)

- The cap counts **memberships** (owned + joined) — the same set `useLists`
  returns. `FREE_LIST_LIMIT = 2` for signed-in free users; the existing
  signed-out local cap is unchanged.
- New helpers (pure, unit-tested):
  - `canCreateList(plan, listCount)`
  - `canJoinList(plan, listCount)`
  - `resolveEditableListIds(plan, lists, activeListIds)` — under/at cap or
    premium: all editable; over cap: only valid picks in `activeListIds`.
  - A "needs chooser" predicate: over cap and `activeListIds` doesn't name 2
    valid current lists.

## User flows

### Signup

1. Tapping **Sign up** routes to new `app/(auth)/choose-plan.tsx`: two cards —
   Free (sync & share, up to 2 lists) and Premium (unlimited lists; price from
   RevenueCat offerings). Existing `redirect` param is threaded through.
2. Either choice continues to the existing `AuthJourney` sign-up form
   (`app/(auth)/sign-up.tsx`) with a `plan` param.
3. If Premium was chosen: after successful account creation, show
   `app/(auth)/paywall.tsx` — monthly/annual selector → store purchase sheet.
   - Success → continue to the post-auth destination.
   - Cancel/failure → continue as Free with a note that upgrading is available
     in Settings. No dead ends.
4. Expo Go & web: purchases are unavailable → the plan chooser is **skipped**
   and signup behaves exactly as today (same degradation pattern as Google
   sign-in; AGENTS.md gets a matching note).
5. Sign-in flow is untouched.

### Enforcement points

- **Create:** the gate in `app/index.tsx` (`openCreateModal`) gains a signed-in
  branch: free + at cap → upgrade modal (premium pitch + paywall CTA) instead
  of the create form. Signed-out behavior unchanged.
- **Join:** `app/join/[listId].tsx` / `lib/joinList.ts` — free + at cap →
  block with upgrade prompt before the join write.
- **Over-cap read-only:** lists not in `activeListIds` while over cap:
  - list screen shows a "Read-only — the free plan includes 2 lists" banner
    with upgrade CTA; add-item input, checking, editing, reordering disabled;
  - home screen shows a lock badge on read-only lists;
  - deleting or leaving a list frees a slot.
- **Chooser modal:** shown when over cap with no valid pick — "Pick 2 lists to
  keep editable"; writes `activeListIds`.

### Settings (Plan section)

- Current tier badge (Free/Premium).
- Free → **Upgrade to Premium** (same paywall component as signup).
- Premium → renewal/expiry info, **Manage subscription** (opens the store's
  subscription-management page via RevenueCat `managementURL` — the only
  store-compliant cancel/downgrade path; access continues until the paid
  period ends), and **Restore purchases** (Apple review requirement).
- Web/Expo Go: show plan status; upgrade explains it needs the mobile app.
- Comped users (`planSource === 'comp'`): badge reads "Premium —
  complimentary"; no Manage subscription (there is no store subscription) and
  no upgrade CTA. If a comped user also holds a store subscription, the store
  view wins so they can still manage it.

## Error handling

- Purchase cancelled by user → silent; remain Free.
- Purchase/restore failure → branded in-app modal (`lib/appAlert.ts`), never a
  native alert.
- Offline → RevenueCat SDK serves cached entitlements; fresh installs default
  to Free.
- Known accepted limitation: with client-side enforcement, a lapsed
  subscription observed only from the web build leaves the mirrored `premium`
  flag stale until the mobile app next launches; and hand-crafted Firestore
  writes could exceed the cap. Neither yields unpaid premium. Server-side
  hardening (membership counters maintained by Cloud Function triggers +
  security-rule checks) is a documented follow-up if warranted.

## Testing

- Jest (jest-expo): all `lib/listLimits.ts` helpers incl. over-cap resolution
  and chooser predicate; plan derivation from mocked RevenueCat customer info;
  plan merge across the four store/comp combinations (incl. `planSource`
  precedence); purchases module probe fallback (SDK absent under Jest
  exercises the same path as Expo Go).
- Manual: sandbox purchases (App Store sandbox / Play internal testing) on a
  dev build — purchase, cancel-mid-flow, restore, cancellation → read-only
  downgrade path.

## Store / dashboard prerequisites (not code)

1. App Store Connect: subscription group with monthly + annual products.
2. Play Console: one subscription with monthly + annual base plans.
3. RevenueCat: project with `premium` entitlement, default offering containing
   monthly/annual packages; attach both store apps.
4. `.env`: `EXPO_PUBLIC_REVENUECAT_APPLE_KEY`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`.
5. Prices are configured in the store consoles only — never hardcoded; the
   paywall renders whatever the offering returns.

## Out of scope

- Web (Stripe) purchases.
- Firestore-rules/server-side cap enforcement.
- In-app admin UI for managing comp grants (Firebase console is the tool) and
  grant expiry dates.
- Grandfathering: any pre-existing free account with >2 lists goes through the
  same over-cap chooser/read-only flow.
- Proration UX for monthly↔annual switches (the stores/RevenueCat handle the
  mechanics; the paywall simply allows selecting the other package).
