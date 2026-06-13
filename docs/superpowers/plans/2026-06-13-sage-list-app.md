# Sage List App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sage — a cross-platform (Android, iOS, Web) collaborative list app with warm organic design, Firebase backend, and real-time sync, testable on Pixel 8 Pro via Expo Go.

**Architecture:** Expo Router file-based navigation with tab layout for Lists/History/Settings. **Local-first:** lists and items persist in AsyncStorage by default; Firestore `onSnapshot` listeners drive real-time UI when signed in. Account is optional — required only for sharing and cross-device sync. On sign-up/sign-in, local data migrates to Firestore via `lib/migrateLocalToCloud.ts`. Theme tokens in a single `lib/theme.ts` consumed by all components.

**Tech Stack:** Expo SDK 52+, Expo Router, React Native, Firebase (Auth, Firestore), Reanimated 3, expo-font, @expo-google-fonts/fraunces, @expo-google-fonts/nunito-sans

**Design spec:** `docs/superpowers/specs/2026-06-13-sage-list-app-design.md`

---

## File Map

| Path | Responsibility |
|---|---|
| `app/_layout.tsx` | Root layout, font loading, theme provider (no auth gate) |
| `app/(auth)/sign-in.tsx` | Sign-in screen |
| `app/(auth)/sign-up.tsx` | Sign-up screen |
| `app/(tabs)/_layout.tsx` | Bottom tab navigator |
| `app/(tabs)/index.tsx` | Lists home (Card Garden) |
| `app/(tabs)/history.tsx` | Item history tab |
| `app/(tabs)/settings.tsx` | Theme + account settings |
| `app/list/[id].tsx` | List detail with items |
| `lib/firebase.ts` | Firebase app init (auth, firestore) |
| `lib/theme.ts` | Color tokens, spacing, radii for light/dark |
| `lib/localStore.ts` | AsyncStorage CRUD for anonymous/local lists and items |
| `lib/migrateLocalToCloud.ts` | Upload local data to Firestore on account creation |
| `contexts/AuthContext.tsx` | Auth state provider |
| `contexts/ThemeContext.tsx` | Theme preference provider |
| `hooks/useLists.ts` | Firestore listener for user's lists |
| `hooks/useListItems.ts` | Firestore listener for list items |
| `hooks/useItemHistory.ts` | Read/write item history |
| `hooks/usePresence.ts` | Collaborator presence |
| `components/ListCard.tsx` | Home screen list card |
| `components/ListItemRow.tsx` | Checkable item row |
| `components/AddItemSheet.tsx` | Bottom sheet with history chips |
| `components/ShareSheet.tsx` | Invite link + collaborators |
| `components/Fab.tsx` | Floating action button |
| `components/EmptyState.tsx` | Empty lists/items illustration |

---

### Task 1: Scaffold Expo Project

**Files:**
- Create: project root via `create-expo-app`
- Create: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`

- [ ] **Step 1: Create Expo app with Router template**

```bash
cd c:/Users/geoff/StudioProjects/list
npx create-expo-app@latest . --template tabs
```

Expected: Project scaffolded with `app/` directory and `package.json`

- [ ] **Step 2: Install core dependencies**

```bash
npx expo install expo-router react-native-reanimated react-native-gesture-handler expo-font @expo-google-fonts/fraunces @expo-google-fonts/nunito-sans expo-linking expo-clipboard @react-native-async-storage/async-storage
npm install firebase
```

- [ ] **Step 3: Verify dev server starts**

```bash
npx expo start
```

Expected: Metro bundler starts; QR code displayed

- [ ] **Step 4: Test on Pixel 8 Pro**

Install Expo Go on Pixel 8 Pro. Scan QR code (same Wi‑Fi) or run `npx expo start --android` with USB debugging enabled.

Expected: Default tabs template loads on device

---

### Task 2: Theme System

**Files:**
- Create: `lib/theme.ts`
- Create: `contexts/ThemeContext.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create theme tokens**

Create `lib/theme.ts`:

```typescript
export const colors = {
  light: {
    bg: '#FAF7F2',
    surface: '#FFFFFF',
    surfaceMuted: '#F3EDE4',
    text: '#2C2417',
    textSecondary: '#6B5E4F',
    accent: '#C4785A',
    accentSoft: '#E8D5C4',
    success: '#5A8F6B',
    border: '#E5DDD0',
  },
  dark: {
    bg: '#1A1612',
    surface: '#252019',
    surfaceMuted: '#2E2820',
    text: '#F5F0E8',
    textSecondary: '#A89B8C',
    accent: '#D4917A',
    accentSoft: '#3D3228',
    success: '#7DB88E',
    border: '#3D352C',
  },
} as const;

export const radii = { card: 18, item: 14, checkbox: 7, fab: 18 } as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';
```

- [ ] **Step 2: Create ThemeContext**

Create `contexts/ThemeContext.tsx` with `ThemeProvider`, `useTheme()` hook. Resolve `system` preference via `useColorScheme()`. Persist preference to AsyncStorage key `themePreference`.

- [ ] **Step 3: Wire fonts and theme in root layout**

Modify `app/_layout.tsx` to load Fraunces and Nunito Sans via `useFonts`, wrap app in `ThemeProvider`, set `StatusBar` style based on active theme.

- [ ] **Step 4: Verify theme on device**

Toggle device dark mode. App background should switch between cream and espresso.

---

### Task 3: Firebase Setup

**Files:**
- Create: `lib/firebase.ts`
- Create: `lib/types.ts`
- Create: `.env` (local only, gitignored)
- Create: `firebase/firestore.rules`

- [ ] **Step 1: Create Firebase project**

In Firebase Console: create project "sage-list" (or similar). Enable Authentication (Email/Password) and Firestore. Storage is not required.

- [ ] **Step 2: Add Firebase config**

Create `lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

Create `.env` with `EXPO_PUBLIC_*` vars from Firebase console. Add `.env` to `.gitignore`.

- [ ] **Step 3: Define types**

Create `lib/types.ts`:

```typescript
export interface SageList {
  id: string;
  name: string;
  emoji: string;
  ownerId: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ListItem {
  id: string;
  name: string;
  quantity: string | null;
  description: string | null;
  link: string | null;
  checked: boolean;
  order: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemHistoryEntry {
  id: string;
  name: string;
  quantity: string | null;
  lastUsedAt: Date;
  useCount: number;
  lastListId: string;
}

export interface SageUser {
  uid: string;
  displayName: string;
  email: string;
  themePreference: 'system' | 'light' | 'dark';
}
```

- [ ] **Step 4: Deploy security rules**

Write and deploy Firestore rules per design spec section 6. Test with Firebase Rules Playground.

---

### Task 4: Authentication

**Files:**
- Create: `contexts/AuthContext.tsx`
- Create: `app/(auth)/sign-in.tsx`
- Create: `app/(auth)/sign-up.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create AuthContext**

`contexts/AuthContext.tsx` — wrap `onAuthStateChanged`, expose `user`, `signIn`, `signUp`, `signOut`. On first sign-up, create `users/{uid}` document in Firestore.

- [ ] **Step 2: Build sign-in screen**

Warm organic styling: cream background, terracotta CTA button, Fraunces heading "Welcome to Sage", email + password inputs, link to sign-up.

- [ ] **Step 3: Build sign-up screen**

Display name, email, password fields. On success, create user doc and redirect to tabs.

- [ ] **Step 4: Optional auth (modal stack)**

Tabs are always accessible. Auth screens (`(auth)`) present as a modal when user chooses to sign in/up from Settings or Share. No auth gate on app launch.

- [ ] **Step 5: Local data migration**

On sign-up or sign-in, `migrateLocalDataToCloud(uid)` uploads local lists/items to Firestore and clears local store.

Sign up with test account on device. Verify user doc created in Firestore console.

---

### Task 5: Lists Home Screen

**Files:**
- Create: `hooks/useLists.ts`
- Create: `components/ListCard.tsx`
- Create: `components/Fab.tsx`
- Create: `components/EmptyState.tsx`
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: useLists hook**

Query lists where `memberIds` array-contains current user's uid. `onSnapshot` for real-time updates. Return `{ lists, loading, createList }`.

`createList(name, emoji)` writes new doc with `ownerId` and `memberIds: [uid]`.

- [ ] **Step 2: ListCard component**

Props: `list`, `onPress`. Render emoji, name, done/total progress bar, collaborator count. 18px radius, border, no shadow.

- [ ] **Step 3: Home screen**

Replace `app/(tabs)/index.tsx` placeholder. Header "Sage" + summary. Map `lists` to `ListCard`. FAB opens create-list modal (name + emoji picker). Empty state when no lists.

- [ ] **Step 4: Style bottom tabs**

Customize tab bar in `app/(tabs)/_layout.tsx`: warm colors, Nunito Sans labels, accent tint on active tab.

- [ ] **Step 5: Test on Pixel**

Create 2–3 lists. Verify they appear and persist after app restart.

---

### Task 6: List Detail & Items

**Files:**
- Create: `app/list/[id].tsx`
- Create: `hooks/useListItems.ts`
- Create: `components/ListItemRow.tsx`

- [ ] **Step 1: useListItems hook**

`onSnapshot` on `lists/{listId}/items` ordered by `order` field. Expose `items`, `addItem`, `toggleItem`, `updateItem`, `deleteItem`.

- [ ] **Step 2: ListItemRow component**

Rounded checkbox, item name, quantity pill, link badge. Strikethrough + opacity when checked. `onToggle`, `onPress` callbacks.

- [ ] **Step 3: List detail screen**

`app/list/[id].tsx` — back button, Fraunces title, inline add field, scrollable items, footer progress count. Navigate from ListCard `onPress`.

- [ ] **Step 4: Inline add**

Typing in add field + Enter/submit calls `addItem(name)`. Also updates item history (Task 8).

- [ ] **Step 5: Test real-time sync**

Open same list on web browser and Pixel with two accounts. Add item on phone → appears on web within 1 second.

---

### Task 7: Item Detail Editor

**Files:**
- Create: `app/list/[id]/item/[itemId].tsx` (or modal)
- Modify: `components/ListItemRow.tsx`

- [ ] **Step 1: Item detail screen**

Editable fields: name (large Fraunces input), quantity, description (multiline), link. Save button updates Firestore doc.

- [ ] **Step 2: Link field**

Validate URL format. Open link in browser on tap (detail view mode).

- [ ] **Step 3: Test on Pixel**

Edit item fields and verify they persist after reload.

---

### Task 8: Item History & Suggestions

**Files:**
- Create: `hooks/useItemHistory.ts`
- Create: `components/AddItemSheet.tsx`
- Modify: `app/list/[id].tsx`

- [ ] **Step 1: useItemHistory hook**

Read `users/{uid}/itemHistory` ordered by `lastUsedAt` desc. `recordItemUsage(name, quantity, listId)` upserts history entry (increment `useCount`, update `lastUsedAt`).

- [ ] **Step 2: AddItemSheet component**

Bottom sheet with text input, horizontal history chips, "Create [text]" button. Filter chips by input text.

- [ ] **Step 3: Wire into list detail**

FAB or inline add opens sheet instead of plain text input. Chip tap → `addItem` + `recordItemUsage`.

- [ ] **Step 4: History tab**

`app/(tabs)/history.tsx` — flat list of all history entries. Tap → show list picker modal → add to selected list.

---

### Task 9: Sharing & Collaboration

**Files:**
- Create: `components/ShareSheet.tsx`
- Create: `hooks/usePresence.ts`
- Modify: `app/list/[id].tsx`

- [ ] **Step 1: Share sheet UI**

Invite link display + copy button (expo-clipboard). Collaborator list with online dots. "+ Invite someone" triggers native share sheet with link.

- [ ] **Step 2: Join flow**

Add `app/join/[listId].tsx` deep link handler. If authenticated, append uid to `memberIds`. If not, redirect to sign-in then join.

Configure `app.json` scheme: `sage` and intent filters for Android.

- [ ] **Step 3: Presence hook**

Write `lists/{listId}/presence/{uid}` with `lastActive` on focus/blur interval (every 15s). `usePresence` returns list of active user display names.

- [ ] **Step 4: Presence indicator**

Show "Alex editing now" + pulsing green dot in list detail header when another user is active.

- [ ] **Step 5: Test two-device sync**

Share list from phone A to phone B (or web). Both users add/check items simultaneously. Verify no data loss.

---

### Task 10: Settings & Theme Toggle

**Files:**
- Modify: `app/(tabs)/settings.tsx`
- Modify: `contexts/ThemeContext.tsx`

- [ ] **Step 1: Settings screen**

Segmented control: System / Light / Dark. Display user email and display name. Sign out button.

- [ ] **Step 2: Persist theme to Firestore**

On theme change, update `users/{uid}.themePreference` and AsyncStorage.

- [ ] **Step 3: Load theme on sign-in**

Read `themePreference` from user doc on auth; apply before first render.

- [ ] **Step 4: Test theme persistence**

Set dark mode → sign out → sign in → dark mode still active.

---

### Task 11: Animations & Polish

**Files:**
- Modify: `components/ListItemRow.tsx`
- Modify: `components/ListCard.tsx`
- Modify: `components/AddItemSheet.tsx`
- Modify: `components/Fab.tsx`

- [ ] **Step 1: Check-off animation**

Reanimated `withSpring` scale on checkbox press. Animated strikethrough opacity over 200ms.

- [ ] **Step 2: Card press feedback**

`Pressable` with `withSpring` scale 0.98 on press in/out.

- [ ] **Step 3: Bottom sheet animation**

`@gorhom/bottom-sheet` or Reanimated slide-up with spring damping for AddItemSheet and ShareSheet.

- [ ] **Step 4: Chip stagger**

History chips fade+scale in with 30ms stagger on sheet open.

- [ ] **Step 5: Final Pixel walkthrough**

Run through full manual test checklist from design spec section 10.

---

### Task 12: Web Layout

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Constrain web width**

On `Platform.OS === 'web'`, wrap content in centered column max-width 430px with `bg` color filling viewport.

- [ ] **Step 2: Verify in browser**

Run `npx expo start --web`. Confirm layout matches mobile mockups.

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Multiple lists | Task 5 |
| Multiple items per list | Task 6 |
| Re-add from history | Task 8 |
| Check off items | Task 6, 11 |
| Share with others | Task 9 |
| Rich item details | Task 7 |
| Firebase database | Task 3 |
| Light/dark mode | Task 2, 10 |
| Warm organic design | Task 2 + all UI tasks |
| Animations | Task 11 |
| Pixel 8 Pro testing | All tasks (Expo Go) |
| Real-time collaboration | Task 6, 9 |
| Auth | Task 4 |

No spec gaps identified.

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-06-13-sage-list-app.md`.**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session with checkpoints for review

Which approach would you like?
