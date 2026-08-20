# Premium setup (one-time console work)

Code ships without any of this, but real purchases need it all.

## App Store Connect (iOS)
1. Create a subscription group "Premium".
2. Add two auto-renewing subscriptions: monthly and annual. Set prices here —
   never in code.
3. Fill in the required subscription metadata + review screenshot.

## Google Play Console (Android)
1. Monetize → Subscriptions → create one subscription "Premium".
2. Add two base plans: `monthly` and `annual`, with prices. **Activate them** —
   a draft base plan never reaches RevenueCat.
3. Purchases need a build on a testing track (internal is fine) at least once.
4. Users and permissions → invite a Google Cloud **service account** and grant
   it the Play Developer API access RevenueCat needs. Its JSON key goes into
   RevenueCat in the next section.

## RevenueCat
Each step here is invisible until the one before it is done, so work in order.

1. Create a project; add both the App Store and Play Store apps. The Play app's
   package must be `com.goode_company.listkitty`.
2. Upload the Play service account JSON key to the Play app. **Without it
   RevenueCat cannot see your Play products at all** — the app then logs
   `ConfigurationError … no Play Store products registered` and every offering
   resolves empty, which looks exactly like having built nothing.
3. Entitlements: create one with the identifier `premium` (must match
   `ENTITLEMENT_ID` in `lib/purchases.native.ts`).
4. Products: import the store products; attach all of them to the `premium`
   entitlement.
5. Offerings: the `default` offering gets a monthly and an annual package, and
   must be marked **current**. `getPremiumPackages` reads `offerings.current`,
   so an offering that isn't the current one yields zero packages — the same
   symptom as having no products.
6. Use the standard Monthly and Annual package types. `getPremiumPackages` maps
   anything else to `'other'`, and both the plan chooser and the paywall look
   for `monthly` / `annual` specifically.
7. Copy the public SDK keys (Apple + Google) into `.env`:
   `EXPO_PUBLIC_REVENUECAT_APPLE_KEY`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`.
   EAS builds read these from the EAS environment, not from `.env` — set them
   there too, or the purchase UI stays hidden in store builds.
8. Rebuild dev clients (`npx expo run:android` / `run:ios`).

Until this section is finished the app degrades on purpose rather than
breaking: the paywall says "Plans aren't available right now" and hides
Subscribe, and the plan chooser shows "Monthly or annual" instead of a price.
The RevenueCat SDK still logs the `ConfigurationError` at error level on every
launch; that noise is expected and clears once a current offering exists.

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
