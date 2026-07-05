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

## Firestore security rules
The `premiumGrants` read rule ships in `firebase/firestore.rules` but must be
deployed once: `firebase deploy --only firestore:rules` from the repo root.
Until then, comp grants silently resolve to "no grant".

## Complimentary premium (friends, family, testing)
Firebase console → Firestore → `premiumGrants` collection → Add document:
- Document ID: the person's sign-in email, **lowercased** — a mixed-case ID
  will never match and the grant will silently not apply. (Apple
  "Hide My Email" users: use the relay address they sign in with.)
- Fields: optional, e.g. `note: "Mum"`, `createdAt: <today>`.

Delete the doc to revoke. Both apply live in the app. Comped users skip the
paywall and see "Premium — Complimentary" in Settings.

## Testing purchases
Sandbox purchases require a dev build signed appropriately: use App Store
sandbox testers (iOS) or a Play internal-testing install (Android). Expo Go
and web intentionally hide all purchase UI.
