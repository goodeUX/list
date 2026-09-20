# List Kitty Design System — Design Spec

**Date:** 2026-09-20
**Branch:** `design-system-refresh` (worktree `.worktrees/design-system`)
**Figma file:** https://www.figma.com/design/dShBLjbHDWRDboNjtVq30K/List-Kitty

## Goal

Create a **design system** for List Kitty that lives in two mirrored places:

1. **Figma** — variable-based tokens (primitive + semantic) and a component library.
2. **Code** — a `lib/design/` token module and the app's components refactored to consume it.

This is an **identity refresh**, not just a formalization: the visual language moves to a
**playful, cat-forward** direction (brighter color, rounder shapes, a friendly display face)
while keeping the warm, cozy soul of the current app.

## Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Intent | Refresh the identity (playful & cat-forward) |
| Component scope | **All ~28** existing components, designed now, rolled out in phases |
| Code strategy | **Refactor in place**, on a disposable branch/worktree (reversible) |
| Figma ↔ code | Build **both**, kept in sync |
| Token architecture | **Approach A** — two tiers (Primitives → Semantic), manual mirror + Code Connect |
| Primary color | Coral `#FF6B5C` |
| Danger color | Deep red `#D2322F` (kept distinct from the coral primary) |
| Heading font | **Fredoka** |
| Body/UI font | **Nunito Sans** (unchanged) |

## Non-goals

- Web build styling. The app is **mobile-only** right now; `WebShell` and web-only paths are out of scope.
- Animation/mascot work (the shelved Rive cat idea) — separate effort.
- A design-tokens build pipeline (Approach C) — explicitly rejected as over-tooled for this RN app.

---

## 1. Token architecture

Two Figma **variable collections**, mirrored 1:1 in code. Components consume **semantic** tokens only.

- **Primitives** (single mode) — raw scales. Not used directly by components.
  - Color ramps (`family/step`, steps 50–900)
  - Spacing scale, radius scale, type sizes, line heights
- **Semantic** (two modes: **Light**, **Dark**) — role tokens that **alias** primitives.
  - e.g. `bg → sand/50` (Light), `bg → #1A1612` (Dark)

**Naming**
- Primitives: `family/step` in Figma (`coral/500`), `colors.coral[500]` in code.
- Semantic: role dot-names in Figma (`primary`, `primary-pressed`, `on-primary`), camelCase in code (`primary`, `primaryPressed`, `onPrimary`).
- Figma variable **scopes** are set explicitly per variable (never `ALL_SCOPES`).

---

## 2. Color

### 2.1 Primitive ramps

Approximate values; exact ramp tuning happens in implementation. `500` is the anchor hue.

**coral** (primary): 50 `#FFF0EE` · 100 `#FFDAD5` · 200 `#FFB8AF` · 300 `#FF9488` · 400 `#FF7C6E` · **500 `#FF6B5C`** · 600 `#ED5546` · 700 `#C8412F` · 800 `#9E3326` · 900 `#6E2117`

**sand** (warm neutral — bg/surface/border/ink): 50 `#FFF8EF` · 100 `#F3EDE4` · 200 `#E9E0D3` · 300 `#E5DDD0` · 400 `#D8CCBB` · 500 `#B9AB98` · 600 `#8A7F72` · 700 `#6B5E4F` · 800 `#4A4034` · 900 `#2B2018` (plus true white `#FFFFFF` as `surface`)

**teal** (secondary): 50 `#E6F5F3` · 100 `#C4E8E4` · 200 `#93D5CF` · 300 `#5FC0B8` · 400 `#3DAFA6` · **500 `#2FA29B`** · 600 `#268780` · 700 `#1F6D67` · 800 `#17524E` · 900 `#0F3734`

**butter** (accent): 50 `#FFF7E6` · 100 `#FFECC2` · 200 `#FFDD93` · 300 `#FFD065` · 400 `#FFC957` · **500 `#FFC24B`** · 600 `#EDAB2E` · 700 `#C98A1E` · 800 `#9E6C15` · 900 `#6E4A0E`

**green** (success): 50 `#EAF5EE` · 100 `#CBE8D4` · 200 `#A3D6B3` · 300 `#77C08F` · 400 `#5CAF78` · **500 `#4CA167`** · 600 `#3C8654` · 700 `#2F6B43` · 800 `#235133` · 900 `#163622`

**red** (danger): 50 `#FCECEA` · 100 `#F8CFCC` · 200 `#F0A29D` · 300 `#E66E68` · 400 `#DB4A44` · **500 `#D2322F`** · 600 `#B22826` · 700 `#8F1F1E` · 800 `#6B1817` · 900 `#47100F`

### 2.2 Semantic roles (Light / Dark)

| Role | Light | Dark |
|---|---|---|
| `bg` | `#FFF8EF` (sand/50) | `#1A1612` |
| `surface` | `#FFFFFF` | `#252019` |
| `surfaceMuted` | `#F3EDE4` (sand/100) | `#2E2820` |
| `surfaceRaised` | `#FFFFFF` | `#2E2820` |
| `text` | `#2B2018` (sand/900) | `#F5F0E8` |
| `textSecondary` | `#6B5E4F` (sand/700) | `#A89B8C` |
| `textMuted` | `#8A7F72` (sand/600) | `#7E7365` |
| `border` | `#E5DDD0` (sand/300) | `#3D352C` |
| `borderStrong` | `#D8CCBB` (sand/400) | `#4A4034` |
| `primary` | `#FF6B5C` (coral/500) | `#FF7C6E` (coral/400) |
| `primaryPressed` | `#ED5546` (coral/600) | `#FF6B5C` (coral/500) |
| `primarySoft` | `#FFDAD5` (coral/100) | `#3D2A26` |
| `onPrimary` | `#FFFFFF` | `#FFFFFF` |
| `secondary` | `#2FA29B` (teal/500) | `#3DAFA6` (teal/400) |
| `accent` | `#FFC24B` (butter/500) | `#FFC957` (butter/400) |
| `success` | `#4CA167` (green/500) | `#7DB88E` |
| `danger` | `#D2322F` (red/500) | `#E06A5E` |
| `dangerSoft` | `#FCECEA` (red/50) | `#3D211F` |
| `scrim` | `rgba(43,32,24,0.5)` | `rgba(0,0,0,0.6)` |

Contrast: every text-on-surface and text-on-primary pairing must meet **WCAG AA** (4.5:1 body, 3:1 large). `onPrimary` white on coral/500 passes for large/semibold button labels; verify body-size uses during implementation and darken the primary text pairing if needed.

---

## 3. Typography

Fredoka (display) + Nunito Sans (text). Adds `@expo-google-fonts/fredoka`, loaded in `app/_layout.tsx`.

| Token | Family / weight | Size / Line height |
|---|---|---|
| `display` | Fredoka Bold (700) | 34 / 40 |
| `h1` | Fredoka Bold (700) | 28 / 34 |
| `h2` | Fredoka SemiBold (600) | 22 / 28 |
| `title` | Fredoka Medium (500) | 18 / 24 |
| `bodyL` | Nunito Sans Regular (400) | 17 / 26 |
| `body` | Nunito Sans Regular (400) | 15 / 22 |
| `bodyS` | Nunito Sans Regular (400) | 13 / 18 |
| `label` | Nunito Sans SemiBold (600) | 15 / 20 |
| `caption` | Nunito Sans Regular (400) | 12 / 16 |

- Figma: one **text style** per token, bound to font-size / line-height variables where practical.
- Code: `typography.ts` exports presets `{ fontFamily, fontSize, lineHeight }` keyed by token. Android keeps `includeFontPadding: false` (as today).
- Font package styles: `Fredoka_500Medium`, `Fredoka_600SemiBold`, `Fredoka_700Bold`; `NunitoSans_400Regular/_600SemiBold/_700Bold` (already present).

---

## 4. Shape, spacing, elevation

### 4.1 Radius (rounder for playfulness)

`sm 10 · md 14 · lg 18 · xl 24 · full 999`

Component defaults: button 14, input 14, card 20, checkbox 8, chip full, FAB full. Keep `borderCurve: 'continuous'` on iOS; Android falls back to the plain radius.

### 4.2 Spacing

`space: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48` (extends current `xs 4 / sm 8 / md 16 / lg 24 / xl 32`). Existing names kept as aliases during migration.

### 4.3 Elevation (warm-tinted shadows)

Three soft shadows using a brown base (`#2B2018`), not gray — keeps the cozy feel. Each token carries RN-ready values `{ shadowColor, shadowOffset, shadowRadius, shadowOpacity, elevation }`.

| Token | Use | Offset / radius / opacity | Android elevation |
|---|---|---|---|
| `e1` | cards, list rows | `0,1` / `3` / `0.06` | 1 |
| `e2` | menus, raised sheets | `0,4` / `12` / `0.10` | 4 |
| `e3` | modals, FAB | `0,12` / `28` / `0.16` | 12 |

Figma: three **effect styles** (`Elevation/1..3`).

---

## 5. Components — inventory & rollout

All ~28 existing components are formalized. Each Figma component gets variants + states
(default / pressed / disabled / loading, where relevant), variables bound, and a **Code Connect**
mapping to its code file. Rollout is phased so the app is never fully churned at once.

### Phase 1 — Foundations
Tokens (color / type / space / radius / elevation) + primitives:
- `Button` (`components/Button.tsx`) — variants primary / secondary / surface / ghost / destructive; states default/pressed/disabled/loading; optional icon.
- `IconButton` (`components/ListOptionsMenu` trigger pattern / standalone)
- `ThemedTextInput` (`components/ThemedTextInput.tsx`) — default/focused/error/disabled.
- `MaterialSymbol` / icon usage (`components/MaterialSymbol.tsx`)
- `Avatar` / `UserAvatar` (`components/UserAvatar.tsx`) — sizes, image/initials/fallback.
- `Divider`
- `Badge` / `Lozenge`, `Chip`
- `EmptyState` (`components/EmptyState.tsx`)

### Phase 2 — List surface
- `ListCard` (`components/ListCard.tsx`)
- `ListItemRow` (`components/ListItemRow.tsx`) — unchecked/checked, with checkbox token.
- `SubItemRow` (`components/SubItemRow.tsx`)
- `ReorderableItemList` (`components/ReorderableItemList.tsx`) — drag state.
- `AddItemSuggestions` (`components/AddItemSuggestions.tsx`)
- `EmojiPickerButton` (`components/EmojiPickerButton.tsx`)
- `Switch`
- `Header`

### Phase 3 — Overlays & flows
- `AppAlertModal` / `AppAlertHost` (`components/AppAlertModal.tsx`, `components/AppAlertHost.tsx`)
- `BenefitsModal`, `SignInBenefitsModal`, `UpgradePromptModal`
- `ListFormModal`, `EmojiPickerSheet`, `ChooseEditableListsModal`
- `ListOptionsMenu`, `ListSortMenu`
- `ShareListContent`, `JoinInviteLanding`
- `OpeningScreen`
- `auth/*` — `AuthJourney`, `BiometricGate`, `SocialAuthButtons`
- Utilities kept but restyled as needed: `KeyboardDismissScrollView`.

Out of scope: `WebShell` (web-only).

---

## 6. Code structure

```
lib/design/
  primitives.ts   # raw scales: color ramps, spacing, radius, type sizes, line heights
  semantic.ts     # light/dark role maps → primitives
  typography.ts   # text presets { fontFamily, fontSize, lineHeight } per token
  elevation.ts    # shadow presets per token
  index.ts        # barrel export
```

- `contexts/ThemeContext.tsx` expands its value to expose `typography`, `elevation`, and the
  new semantic `colors`, keeping the existing `useTheme()` consumption pattern. `colorScheme`
  selects the Light/Dark semantic map.
- `lib/theme.ts` and `lib/buttonStyles.ts` fold into `lib/design/` (old names re-exported
  temporarily to avoid a big-bang import churn, removed once migration completes).
- `app/_layout.tsx` loads the Fredoka font family alongside the existing fonts.
- Targets Expo SDK 57 / RN 0.86 conventions (navigation from `expo-router`, `absoluteFill`
  helper, tsconfig types) already in use.

---

## 7. Figma structure & sync

- **Pages:** `Foundations` (token documentation), `Components` (rebuilt library). Exploration
  pages (`🎨 Palette Explorations`, `🔤 Type Explorations`) archived once locked. Existing
  `UI Library` kept as reference until sign-off, then superseded.
- **Variable collections:** `Primitives` (1 mode), `Semantic` (`Light` / `Dark` modes).
- **Text styles** for each typography token; **effect styles** for each elevation token.
- **Components** with variants + component properties, variables bound (no hardcoded values).
- **Code Connect** maps each Figma component to its code component so the two stay honest.

---

## 8. Verification

- **Code:** `tsc` typecheck + `jest` unit tests must pass after each phase. Geoff verifies the
  live UI himself (mobile), per standing preference — no self-driven browser verification.
- **Figma:** `get_metadata` (structure) + `get_screenshot` (visual) after each build step.
- **Contrast:** AA check on the semantic color pairings before Phase 1 sign-off.

## 9. Rollout & reversibility

- All code work on `design-system-refresh` in `.worktrees/design-system`.
- Phased merges (Foundations → List surface → Overlays); each phase is independently reviewable
  and revertable. `main` stays clean until Geoff signs off.
