# Firebase setup (Sage list)

## 1. Create a Firebase project

In [Firebase Console](https://console.firebase.google.com/):

1. Create a project (e.g. `sage-list`).
2. Enable **Authentication** → Email/Password sign-in.
3. Create a **Firestore** database (production mode is fine; deploy rules below before app use).

**You do not need Firebase Storage.** Sage does not upload images — only Auth and Firestore are required (both have generous free tiers).

## 2. Register the app and env vars

1. Project settings → **Your apps** → add a **Web** app.
2. Copy the config values into a local `.env` at the repo root (see `.env.example`).
3. Restart the Expo dev server after creating or editing `.env`.

## 3. Deploy security rules

Install Firebase CLI if needed: `npm install -g firebase-tools`

```bash
firebase login
firebase use --add    # select your project
firebase deploy --only firestore:rules
```

Rules file:

- `firebase/firestore.rules` — users, lists, items, item history

Test rules in Firebase Console → Firestore → **Rules** → Rules Playground.

## 4. Verify in the app

After `.env` is filled, import from `@/lib/firebase` in auth/data code. To check config without initializing Firebase, import `isFirebaseConfigured` from `@/lib/firebaseConfig`.
