# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Google sign-in only appears in dev builds, not Expo Go

The **Continue with Google** button is intentionally hidden in **Expo Go**. Google
sign-in relies on the `@react-native-google-signin/google-signin` native module,
which Expo Go (a fixed sandbox limited to Expo SDK modules) does not include. At
runtime `isGoogleSignInAvailable()` in `lib/socialAuth.native.ts` probes for the
`RNGoogleSignin` native module and returns `false` when it is absent, so the app
degrades gracefully instead of crashing on the package's `getEnforcing` call.

To see and use the button, run a **dev build** (`npx expo run:android` / `run:ios`)
rather than Expo Go. It also requires `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to be set
in `.env`. If the button is missing, check *which app you launched* before touching
the code — a missing button in Expo Go is expected, not a bug.

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
