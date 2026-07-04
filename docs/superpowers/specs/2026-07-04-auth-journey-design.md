# Auth Journey Redesign — Design Spec

**Date:** 2026-07-04
**Status:** Approved pending user review
**Approach:** Evolve the opening screen in place (Approach 1)

## Context

List Kitty currently supports Firebase email/password auth only. The auth UI is
duplicated: `components/OpeningScreen.tsx` (the auth-aware opening overlay with the
cat splash art) contains an inline sign-in form, and `app/(auth)/sign-in.tsx` /
`app/(auth)/sign-up.tsx` repeat nearly identical forms without the cat art. Lists
work locally without an account (AsyncStorage via `lib/localStore`) and migrate to
Firestore on sign-in/sign-up (`lib/migrateLocalToCloud`). Sessions persist via
AsyncStorage-backed Firebase persistence, so returning signed-in users skip
credentials entirely.

The project runs Expo SDK 54 (54.0.35) with dev builds / EAS (Android only today;
iOS configured but not yet built). Web deploys to Firebase Hosting.

## Goals

1. Sign up and log in with Google, Apple, or email.
2. Returning users (signed out) see a login-default screen with a "Welcome back"
   message; first-time users see a signup-default screen.
3. Users can switch between login and signup journeys.
4. Users can skip auth entirely and use locally stored lists.
5. Biometric (fingerprint/Face ID) protection with setup in Settings.
6. The existing cat artwork stays on both the signup and login pages.
7. "Forgot password?" reset flow on the login journey.

## Decisions (made during brainstorming)

| Decision | Choice |
| --- | --- |
| Social auth platforms | Android + iOS only. No social buttons on web (web keeps email flows). |
| Apple sign-in visibility | iOS only. Hidden on Android and web. |
| Biometric semantics | App Lock (app unlock gate), not credential storage. Works for all account types. |
| Email flow | Email-first two-step (Linktree-style): email + Continue, then password (login) or name + password (signup). |
| Expo SDK | Stay on SDK 54. Install packages with `npx expo install` so versions match. Consult current Expo docs (AGENTS.md points at v56) but pin to installed SDK. |
| Architecture | Opening screen remains the journey host; auth UI extracted into shared components reused by the modal screens. |
| Forgot password | In scope: Firebase `sendPasswordResetEmail` from the login password step. |

## Entry flow (cold start)

```
App opens
├── Deep link (/join/…, direct web path) → skip opening entirely (unchanged)
├── Auth loading → cat + spinner (unchanged)
├── Signed in (session persisted)
│   ├── App Lock ON  → BiometricGate: cat + "Welcome back, {name}" + auto biometric
│   │                   prompt; Unlock retries; OS PIN fallback; "Not you? Sign out"
│   └── App Lock OFF → brief "Welcome back, {name}" → auto-enter (unchanged)
├── Signed out + used before → Login journey, "Welcome back{, name}", email prefilled
└── First launch → Signup journey, "Join List Kitty"
```

"Used before" = any of: a recorded prior launch, existing local lists, or a prior
sign-in on this device. Tracked by `lib/authLocalState.ts` (AsyncStorage).

Signing out returns to the home screen (unchanged); the next cold start shows the
login-default journey. The last signed-in name/email hint survives sign-out on
purpose — it powers the welcome-back personalisation and email prefill.

## Journeys (shared `AuthJourney` component)

Both modes render: title + subtitle, step content, "or" divider, social buttons
(platform-gated), footer with mode-switch link and "Skip for now". Skip lands on
local lists (existing behavior). Social buttons behave identically in both modes —
Firebase creates the account on first use, signs in thereafter — so mode choice
never strands anyone.

### Signup mode (first-launch default)

- Title: "Join List Kitty"; subtitle about free sync/share.
- Step 1: email field + **Continue**.
- Step 2 (email users only): name + password + **Create account**; back arrow to step 1.
- Footer: "Already have an account? **Log in**" · "**Skip for now**".

### Login mode (returning default)

- Title: "Welcome back" — personalised ("Welcome back, Geoff") when a stored name
  exists; email prefilled from the stored hint.
- Step 1: email + **Continue**.
- Step 2: password + **Log in** + "**Forgot password?**" link.
- Footer: "New to List Kitty? **Create an account**" · "**Skip for now**".

### Forgot password

"Forgot password?" on the login password step calls `resetPassword(email)`
(Firebase `sendPasswordResetEmail`). Confirmation copy is enumeration-safe:
"If an account exists for {email}, a reset link is on its way." Errors map to the
existing friendly-message pattern.

### Social buttons

- **Continue with Google** — Android + iOS.
- **Continue with Apple** — iOS only.
- Web renders neither; the email-first flow is the only web path.
- Per-provider loading state; cancelled provider sheets are silent no-ops.

### Cat artwork

- Opening screen: current full-size bottom-anchored splash cat, untouched
  (`assets/images/splash-light.png` / `splash-dark.png`, theme-aware).
- Modal `(auth)` screens: same artwork scaled down beneath the form so both auth
  entry points keep the cat.

## Biometric App Lock

- Settings gains a **Security** section (between Appearance and Account):
  "App lock" toggle — "Require fingerprint / Face ID to open List Kitty".
- Enabling runs a biometric check first; only persists ON after success.
- Visibility: shown only when signed in AND biometric hardware exists; if hardware
  exists but nothing is enrolled, show a disabled row with "Set up fingerprint in
  device settings" hint; hidden entirely on web, on hardware-less devices, and for
  signed-out users (the gate protects the signed-in session).
- Gate behavior (cold start, signed in, lock ON): prompt fires automatically on
  mount; **Unlock** button retries; OS-level fallback to device PIN/pattern allowed
  (`disableDeviceFallback: false`); "Not you? Sign out" escape.
- Lockout safety: if authentication is impossible (biometrics unenrolled and no
  device credential), let the user through and switch the lock OFF.
- The App Lock flag is a non-secret preference → AsyncStorage (no SecureStore).
- The gate applies to signed-in sessions only. Skip-users (local-only) never see
  the gate or the toggle in v1.

## Architecture

### New dependencies (via `npx expo install`, SDK-54-pinned)

| Package | Purpose |
| --- | --- |
| `@react-native-google-signin/google-signin` | Native Google sign-in (config plugin; requires dev build — already the workflow) |
| `expo-apple-authentication` | Apple sign-in (iOS) |
| `expo-local-authentication` | Biometric App Lock |

### New modules

| File | Responsibility |
| --- | --- |
| `components/auth/AuthJourney.tsx` | Journey panel: `mode: 'sign-up' \| 'sign-in'`, email-first step state, fields, buttons, footer links. Single source for auth UI. |
| `components/auth/SocialAuthButtons.tsx` | Google/Apple buttons; platform gating; per-provider busy/error handling. |
| `components/auth/BiometricGate.tsx` | Welcome-back unlock view for the opening screen. |
| `lib/socialAuth.native.ts` / `lib/socialAuth.ts` | Platform-split provider layer (mirrors `firebaseAuth.native.ts` pattern). Native: provider SDKs → Firebase `AuthCredential`. Web: providers report unavailable. Exposes `isGoogleAvailable()` / `isAppleAvailable()` / `getGoogleCredential()` / `getAppleCredential()` (Apple returns captured `fullName` too). |
| `lib/authLocalState.ts` | AsyncStorage usage memory: `recordAppUsed()`, `recordSignIn(name, email)`, `getJourneyDefault() → 'sign-in' \| 'sign-up'`, `getLastAccountHint()`. |
| `lib/appLock.ts` + `hooks/useAppLock.ts` | App Lock preference + `authenticate()` wrapper over `expo-local-authentication` (hardware/enrollment checks, fallback config). |

### Changed files

| File | Change |
| --- | --- |
| `contexts/AuthContext.tsx` | Add `signInWithGoogle()`, `signInWithApple()`, `resetPassword(email)`. Social methods: credential → `signInWithCredential` → upsert `users/{uid}` (displayName from provider when absent) → `migrateLocalDataToCloud` → `recordSignIn`. Extend `getAuthErrorMessage` (account-exists-with-different-credential, network, play-services, reset-email cases). |
| `components/OpeningScreen.tsx` | Replace inline form with `AuthJourney` (mode from `authLocalState`) + `BiometricGate` branch. Cat image, zoom transition, timing, skip: untouched. |
| `app/(auth)/sign-in.tsx`, `sign-up.tsx` | Thin wrappers: back button + `AuthJourney` + scaled cat art. Keep `redirect` param handling (`buildAuthHref`, `navigateAfterSignIn`). |
| `app/settings/index.tsx` | New Security section (App Lock toggle + enrollment hint states). |
| `app/settings/edit-account.tsx` | Detect providers via `user.providerData`: social-only accounts get a read-only email field with a "Your email is managed by your Google/Apple account" note (shown-locked chosen over hidden during execution — more informative), password section hidden, name editing kept. |
| `app.json` | Plugins: `@react-native-google-signin/google-signin`, `expo-apple-authentication`, `expo-local-authentication` (with iOS `faceIDPermission` string). `ios.usesAppleSignIn: true`. |

### Data flow (Google example)

Button → `socialAuth.native.getGoogleCredential()` → `GoogleSignin.signIn()` →
idToken → `GoogleAuthProvider.credential(idToken)` → `AuthContext.signInWithGoogle`
→ `signInWithCredential(auth, cred)` → `setDoc(users/{uid}, {merge: true})` →
`migrateLocalDataToCloud(uid)` → `navigateAfterSignIn()` → `recordSignIn(name, email)`.

Email and Apple paths share everything from `signInWithCredential` onward. No
Firestore schema changes.

### AsyncStorage keys (new)

| Key | Meaning |
| --- | --- |
| `auth.hasUsedBefore` | Set once a launch completes or a sign-in happens. Drives login-vs-signup default (local lists also count as usage). |
| `auth.lastAccountHint` | `{ displayName?, email? }` from the most recent sign-in. Powers welcome-back copy + email prefill. Survives sign-out deliberately. |
| `appLock.enabled` | `'1'` when App Lock is on. |

## Edge cases & error handling

- **Email collision across methods:** surface "That email already uses a different
  sign-in method — log in the way you originally signed up." No auto-linking in v1.
- **Apple name capture:** Apple provides `fullName` only on first authorization —
  capture it then, write to Firebase profile + `users` doc (works with private
  relay emails).
- **Cancelled provider sheet / biometric prompt:** silent no-op (no error banner);
  gate stays with retry.
- **Missing Play Services:** "Google sign-in isn't available on this device."
- **Biometrics unenrolled while lock ON:** allow through, auto-disable lock.
- **Password reset:** enumeration-safe confirmation regardless of account existence.
- **Skip → later signup:** all auth paths run the local-to-cloud migration.
- **Offline:** map `auth/network-request-failed` to a friendly retry message.
- **Web:** no social buttons, no Security section; email-first UI otherwise identical.

## One-time console setup (manual, documented for the owner)

1. **Firebase → Authentication → Sign-in method:** enable Google provider; note
   the auto-created **Web client ID** (used by the Google sign-in config).
2. **Firebase project settings → Android app:** register SHA-1 + SHA-256
   fingerprints from EAS (`eas credentials`) for both debug/dev-build and
   production keys.
3. **Apple Developer:** enable the Sign in with Apple capability for
   `com.geo_goo.list`; then enable the Apple provider in Firebase.
4. iOS EAS build required before Apple sign-in / Face ID can be tested.

## Testing / QA matrix

Automated: `npx tsc --noEmit` (no test framework exists in the project).

Manual:

| Scenario | Expected |
| --- | --- |
| Fresh install (Android) | Signup journey default, cat visible |
| Email signup, 2 steps | Continue → name+password → account created, lists migrate |
| Switch links | Signup ↔ login swap correctly, state preserved per mode |
| Skip for now | Lands on local lists; creating lists works |
| Sign out → relaunch | Login default, "Welcome back, {name}", email prefilled |
| Google sign-in (new + returning) | Account created/signed in; name in settings |
| Forgot password | Enumeration-safe confirmation; email arrives; reset works |
| App Lock enable | Biometric confirm required before toggle persists |
| App Lock relaunch | Gate shows; unlock enters app; cancel stays; sign-out works |
| App Lock ON + signed out → fresh sign-in | Auto-enters with NO biometric re-prompt (journey sign-in satisfies the gate) |
| Biometric unenrolled device | Hint row instead of toggle |
| Web | No social buttons, no Security section; email-first flow works |
| iOS (EAS build) | Apple sign-in first-run name capture; Face ID gate |
| Invite deep link | Still bypasses opening screen |
| Edit account as social user | No password section; email read-only + dimmed with "managed by your Google account" note; name editable |

## Out of scope

- Account-linking UI between providers.
- Social auth on web.
- Biometric quick sign-in via stored credentials (App Lock chosen instead).
- Expo Go support (dev builds required — existing workflow).
- App Lock for signed-out / local-only usage.
- SDK 56 upgrade (separate project).
