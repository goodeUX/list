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

# Google sign-in DEVELOPER_ERROR (code 10) is a console problem, never a code bug

If the Google account picker opens and sign-in fails the moment an account is
chosen, the native module rejected with `"10"` — `CommonStatusCodes.DEVELOPER_ERROR`.
It means no Android OAuth client in the Firebase project matches the *installed*
build's package name plus **signing certificate**. Nothing in this repo can fix it.

Each way of installing the app uses a different signing key, and **every one of
them needs its own SHA-1 registered** under Firebase Console → Project settings →
Your apps → Android (`com.goode_company.listkitty`) → Add fingerprint:

- **Play Store install** (`installerPackageName=com.android.vending`) — Play
  re-signs the AAB with its own key, so the EAS fingerprint does *not* apply.
  Get it from Play Console → Test and release → Setup → App signing.
- **EAS build installed directly** (`preview`/`development` profiles) — the EAS
  upload keystore, via `eas credentials -p android`.
- **`npx expo run:android`** — the template debug keystore,
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.

Fingerprints propagate in a few minutes; no rebuild or resubmission is needed.

To read the fingerprint the installed build actually carries:

```bash
adb shell pm path com.goode_company.listkitty
adb pull <base.apk path> base.apk
apksigner verify --print-certs base.apk
```

A DN of `CN=Android, O=Google Inc.` means Play App Signing re-signed it.
