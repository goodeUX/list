# Sage List App — Design Specification

**Date:** 2026-06-13  
**Status:** Approved  
**Interactive mockups:** [list-app-design.canvas.tsx](file:///C:/Users/geoff/.cursor/projects/c-Users-geoff-StudioProjects-list/canvases/list-app-design.canvas.tsx)

---

## 1. Overview

**Sage** is a cross-platform list application for Android, iOS, and Web. Users create multiple lists, add rich items (quantities, links, descriptions), check items off, re-add from history, and collaborate in real time with others.

### Goals

- General-purpose lists (groceries, todos, packing, gifts, reading, household coordination)
- Beautiful, warm, organic UI with light and dark mode
- Real-time collaborative editing (Google Docs–style)
- Testable on a physical Android device (Google Pixel 8 Pro) during development

### Non-Goals (v1)

- Offline-first / conflict resolution beyond last-write-wins
- Push notifications
- List templates or categories
- Web-only admin dashboard
- Paid tiers or billing

---

## 2. Product Decisions (from discovery)

| Decision | Choice |
|---|---|
| Primary use case | General-purpose lists |
| Aesthetic | Warm & organic |
| Sharing model | Real-time collaboration — all members can add, edit, check off |
| Design deliverable | Interactive Cursor canvas mockups |
| Layout approach | **Card Garden** (recommended over Compact Inbox or Unified Feed) |

### Layout approach rationale

**Card Garden (selected):** Lists appear as warm, tactile cards on a scrollable home screen with bottom tab navigation. Inviting and scannable; scales well for typical personal use (under ~30 lists).

**Rejected alternatives:**
- *Compact Inbox* — too utilitarian for the warm aesthetic
- *Unified Feed* — buries list organization and sharing affordances

---

## 3. Visual Identity

### Typography

| Role | Font | Usage |
|---|---|---|
| Display | Fraunces | App title, list names, screen headings |
| Body | Nunito Sans | Item text, labels, metadata |

Load via Expo Google Fonts (`@expo-google-fonts/fraunces`, `@expo-google-fonts/nunito-sans`).

### Color Tokens

#### Light mode

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#FAF7F2` | App background (cream) |
| `surface` | `#FFFFFF` | Cards, sheets |
| `surfaceMuted` | `#F3EDE4` | Input backgrounds, chips |
| `text` | `#2C2417` | Primary text |
| `textSecondary` | `#6B5E4F` | Metadata, placeholders |
| `accent` | `#C4785A` | CTAs, links, active states (terracotta) |
| `accentSoft` | `#E8D5C4` | Icon backgrounds, highlights |
| `success` | `#5A8F6B` | Checked items, progress, online (sage green) |
| `border` | `#E5DDD0` | Card and input borders |

#### Dark mode

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#1A1612` | App background (espresso) |
| `surface` | `#252019` | Cards, sheets |
| `surfaceMuted` | `#2E2820` | Input backgrounds, chips |
| `text` | `#F5F0E8` | Primary text |
| `textSecondary` | `#A89B8C` | Metadata, placeholders |
| `accent` | `#D4917A` | CTAs, links, active states |
| `accentSoft` | `#3D3228` | Icon backgrounds |
| `success` | `#7DB88E` | Checked items, progress, online |
| `border` | `#3D352C` | Card and input borders |

### Shape & Spacing

- Card corner radius: **18px**
- List item corner radius: **14px**
- Checkbox corner radius: **7px**
- FAB corner radius: **18px**
- Generous padding; borders over shadows for depth
- No heavy drop shadows — flat, paper-like surfaces

### Theme Behavior

- Support **system**, **light**, and **dark** preference
- Persist preference in Firebase user profile and local storage
- Respect `useColorScheme()` on native; CSS/media query on web

---

## 4. Information Architecture

### Navigation

Bottom tab bar with three tabs:

1. **Lists** — home screen with all lists
2. **History** — all past items across lists, tap to re-add to active list
3. **Settings** — theme, account, sign out

### Screen Map

```
Auth (sign in / sign up)
  └── Lists (tab)
        ├── List Detail
        │     ├── Item Detail (edit)
        │     ├── Add Item sheet (with history suggestions)
        │     └── Share sheet
        ├── Create List sheet
        └── Empty state
  └── History (tab)
  └── Settings (tab)
```

### Core Screens

#### Home — My Lists

- App title "Sage" with summary ("N lists · M shared")
- Vertical stack of list cards, each showing:
  - Emoji icon (user-selectable, default 📋)
  - List name
  - Progress (`done/total` + thin progress bar)
  - Collaborator count when shared
- FAB (+) to create a new list
- Tap card → List Detail

#### List Detail

- Back navigation
- List title (Fraunces)
- Live presence indicator ("Alex editing now" + green pulse dot)
- Overflow menu (⋯) → rename, delete, share
- Inline "Add an item..." field at top
- Scrollable item rows:
  - Rounded checkbox (tap to toggle)
  - Item name (strikethrough when checked, reduced opacity)
  - Quantity pill, link badge
- Footer: "X of Y complete"
- Tap item row → Item Detail
- Real-time updates from Firestore listeners

#### Item Detail

- Editable fields: name, quantity, description, link
- Save on blur or explicit Save button

#### Add Item Sheet

- Bottom sheet modal
- Text input with focus
- "From your history" — horizontal scroll of suggestion chips
- Tap chip → adds item to current list immediately
- "Create [typed text]" option when no exact match
- Updates item history on add

#### Share Sheet

- Copyable invite link (`sage.app/l/{shortId}` or deep link)
- Collaborator list with avatar, name, role, online indicator
- "+ Invite someone" → share native sheet / copy link
- All invitees get Editor role in v1

#### History Tab

- Searchable list of all items user has ever added (across lists)
- Sorted by `lastUsed` descending
- Tap item → picker to choose which list to add it to (or add to last-used list)

#### Settings Tab

- Theme: System / Light / Dark (segmented control)
- Account info (email, display name)
- Sign out

#### Auth

- Email/password sign up and sign in (Firebase Auth)
- Google Sign-In (optional v1 stretch; email/password required for v1)
- Minimal onboarding: sign in → empty lists state with "Create your first list"

---

## 5. Motion & Interactions

| Interaction | Animation |
|---|---|
| Check-off item | Spring scale 0.95→1; strikethrough + opacity fade over 200ms |
| Card press | Scale to 0.98; subtle background tint |
| Open list | Shared-element transition on list title (Reanimated) |
| Add item sheet | Bottom sheet slide-up with spring damping |
| Collaborator presence | Gentle pulse on green online dot |
| History chips appear | Staggered scale-in, 30ms delay per chip |
| FAB press | Scale 0.92→1 spring |
| List card enter | Fade + translateY on first load |

Use **React Native Reanimated 3** for animations. Prefer `react-native-gesture-handler` for sheet and swipe gestures.

---

## 6. Data Model (Firebase)

### Firestore Collections

```
users/{uid}
  displayName: string
  email: string
  themePreference: "system" | "light" | "dark"
  createdAt: timestamp

lists/{listId}
  name: string
  emoji: string
  ownerId: string
  memberIds: string[]
  createdAt: timestamp
  updatedAt: timestamp

lists/{listId}/items/{itemId}
  name: string
  quantity: string | null
  description: string | null
  link: string | null
  checked: boolean
  order: number
  createdBy: string
  createdAt: timestamp
  updatedAt: timestamp

users/{uid}/itemHistory/{historyId}
  name: string
  quantity: string | null
  lastUsedAt: timestamp
  useCount: number
  lastListId: string
```

### Security Rules (summary)

- Users can read/write their own `users/{uid}` document
- List read: `request.auth.uid in resource.data.memberIds`
- List write: `request.auth.uid in resource.data.memberIds`
- Items: same membership check via parent list
- Item history: owner-only (`request.auth.uid == uid`)
- Only `ownerId` can delete a list or remove members (v1)

### Real-Time Collaboration

- `onSnapshot` listeners on `lists/{listId}/items` for live item sync
- Presence: Firestore `lists/{listId}/presence/{uid}` with `lastActive` timestamp; consider Realtime Database for lower-latency presence if needed
- Show "X editing now" when `lastActive` within last 30 seconds

### Sharing Flow

1. Owner opens Share sheet
2. App generates or retrieves `inviteCode` on list document
3. Recipient opens link → if authenticated, add `uid` to `memberIds`; if not, prompt sign-in then join
4. Deep link format: `sage://join/{listId}` (native), `https://sage.app/join/{listId}` (web)

---

## 7. Technical Architecture

### Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 52+ |
| Routing | Expo Router (file-based) |
| State | React context + Firestore listeners (no Redux for v1) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Animations | React Native Reanimated 3 |
| Gestures | react-native-gesture-handler |
| Fonts | expo-font + Google Fonts packages |
| Testing on device | Expo Go on Pixel 8 Pro (USB or same Wi‑Fi) |

### Project Structure (planned)

```
app/
  (auth)/
    sign-in.tsx
    sign-up.tsx
  (tabs)/
    _layout.tsx
    index.tsx          # Lists home
    history.tsx
    settings.tsx
  list/[id].tsx
  _layout.tsx
components/
  ListCard.tsx
  ListItemRow.tsx
  AddItemSheet.tsx
  ShareSheet.tsx
  ...
lib/
  firebase.ts
  theme.ts
  types.ts
hooks/
  useList.ts
  useItems.ts
  useTheme.ts
  useItemHistory.ts
```

### Cross-Platform Notes

- **Android (Pixel 8 Pro):** Primary dev/test target via Expo Go
- **iOS:** Same codebase; test when available
- **Web:** Expo web export; responsive layout capped at mobile-width column (~430px) centered on desktop

---

## 8. Error Handling

| Scenario | Behavior |
|---|---|
| Network offline | Show banner "You're offline — changes will sync when connected"; queue writes via Firestore offline persistence |
| Auth expired | Redirect to sign-in |
| Join invalid/expired link | Alert "This invite link is no longer valid" |
| Permission denied | Alert "You don't have access to this list" |
| Empty list | Illustration + "Add your first item" CTA |
| No lists | Illustration + "Create your first list" CTA |

---

## 9. Accessibility

- Minimum touch target 44×44 pt
- Checkbox and buttons have `accessibilityLabel`
- Color contrast ≥ 4.5:1 for body text (verified for both themes)
- Support system font scaling
- Screen reader announces checked/unchecked state on toggle

---

## 10. Testing Strategy

### During Development

- Expo Go on Pixel 8 Pro: `npx expo start` → scan QR or `a` for Android
- Hot reload for UI iteration
- Two accounts (or web + phone) to verify real-time sync

### Automated (v1 light)

- Unit tests for pure utilities (theme tokens, item history merge logic)
- No E2E requirement for v1 MVP

### Manual Test Checklist

- [ ] Create list, add items, check off, uncheck
- [ ] Add item from history chip
- [ ] Edit item with quantity, description, link
- [ ] Share list; second user sees live updates
- [ ] Toggle light/dark/system theme
- [ ] Sign out and sign back in; data persists
- [ ] Web layout renders correctly in browser

---

## 11. Open Questions (deferred)

- Final production app name (working title: **Sage**)
- Google Sign-In in v1 or v2
- Push notifications when collaborator adds item
- List archiving vs permanent delete

---

## 12. Approval Record

- **Design direction approved:** 2026-06-13
- **Approver:** User
- **Next step:** Implementation plan → Expo project scaffold
