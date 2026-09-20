# Design System — Phase 2: List Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bring the refreshed design system to the app's core list experience — the list cards, item rows, and the main "My Lists" and list-detail screens — so the identity refresh becomes visible on the primary screens.

**Architecture:** Continue Approach A. Components consume `useTheme()` tokens (`colors`, `radius`, `space`, `typography`, `elevation`). This phase is primarily a **migration**: replace hardcoded font/size/spacing/radius values with tokens, apply Fredoka display type to headings, and add elevation to cards. Plus rebuild the list-surface components in Figma.

**Tech Stack:** Expo SDK 57 / RN 0.86, TypeScript, jest, Figma Plugin API.

**Reference:** spec `docs/superpowers/specs/2026-09-20-design-system-design.md`; Phase 1 plan for the established patterns.

**Branch:** `design-system-refresh` (worktree `.worktrees/design-system`) — do NOT merge; stack on the branch.

---

## Shared migration recipe (apply in every Track A task)

When refactoring a component/screen, read the current file, then:

1. **Headings / titles / list-names** currently in **Fraunces** (or large display text) → replace with the nearest **Fredoka** `typography` token by size:
   - ≥ 30 → `typography.display`; ~26–30 → `typography.h1`; ~20–25 → `typography.h2`; ~17–19 → `typography.title`.
   - Apply as `style={[typography.h1, { color: colors.text }]}` (spread the token, then color). Drop the old `fontFamily`/`fontSize`/`lineHeight` for that text.
2. **Body / label / caption text** (already Nunito Sans) → replace the hardcoded `{ fontFamily, fontSize, lineHeight }` with the matching token: 17→`bodyL`, 15→`body`, 13→`bodyS`, semibold-15→`label`, 12→`caption`. Keep the color as-is (already a semantic role).
3. **Colors** → must be semantic roles (`colors.*`). The `accent→primary` rename already ran; verify no raw hex or `#...` literals remain for themeable colors (leave intentional overlays/gradients).
4. **Radius** → use `radius.*` (`sm/md/lg/xl/full`). Cards → `radius.lg` (or `radius.xl` for large sheets), rows/inputs → `radius.md`, pills/checkbox → `radius.full`/`8`.
5. **Spacing** → use `space[n]` for paddings/margins/gaps where a hardcoded number matches a scale step; leave non-scale one-offs.
6. **Elevation** → give resting cards/rows `elevation.e1`; raised menus `elevation.e2`.
7. Preserve all existing props, behavior, accessibility, and layout structure. This is a restyle, not a rewrite.

**Verification for every Track A task:** `npx tsc --noEmit` passes; `npx jest` stays green (237). Commit per task. Trailer on every commit:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Track A — Component & screen migration

Each task = read file → apply recipe → typecheck → commit. Files:

### Task A1: ListCard
- Modify: `components/ListCard.tsx`
- List name heading → `typography.h1` (Fredoka; currently 28 Nunito) or `h2` if 28 feels too heavy — pick `h2` (22) if the card is compact, `h1` if it's a hero card; **default to `h2`**. Item-count/subtitle → `typography.bodyS` with `colors.textSecondary`. Card container → `radius.lg` + `elevation.e1`. Commit: `feat(design): ListCard tokens + Fredoka title + elevation`.

### Task A2: ListItemRow
- Modify: `components/ListItemRow.tsx`
- Item text → `typography.body`. Checked state text → `colors.textMuted` (keep any strikethrough). Checkbox → `radius` from `radii.checkbox` (already 8) bound to `colors.primary` when checked, `colors.border` when unchecked. Row container radius → `radius.md`. Commit: `feat(design): ListItemRow tokens + typography`.

### Task A3: SubItemRow
- Modify: `components/SubItemRow.tsx`
- Same recipe as ListItemRow at the sub scale (text → `typography.bodyS`). Commit: `feat(design): SubItemRow tokens + typography`.

### Task A4: ReorderableItemList
- Modify: `components/ReorderableItemList.tsx`
- Dragging/active row → lift with `elevation.e2` and `colors.surfaceRaised`; drop shadow uses the token, not hardcoded. Section headers (if any) → `typography.label`/`caption`. Commit: `feat(design): ReorderableItemList drag elevation + tokens`.

### Task A5: AddItemSuggestions
- Modify: `components/AddItemSuggestions.tsx`
- Suggestion chips → reuse the visual language of the new `Chip` (pill `radius.full`, `colors.surfaceMuted`/`primarySoft`); suggestion text → `typography.label`. Commit: `feat(design): AddItemSuggestions chip styling + tokens`.

### Task A6: EmojiPickerButton
- Modify: `components/EmojiPickerButton.tsx`
- Button surface → `colors.surface`/`surfaceMuted`, `radius.md`, `elevation.e1` if raised; label → `typography.label`. Commit: `feat(design): EmojiPickerButton tokens`.

### Task A7: Header
- Modify: `components/Header.tsx` (if present; else the header rendered in the list screens)
- Screen title → `typography.h1` (Fredoka); back/action icons via `colors.text`. Commit: `feat(design): Header Fredoka title + tokens`.

### Task A8: Switch
- Modify: wherever the app's Switch lives (search `components/` for a Switch wrapper; if the app uses RN core `Switch`, add a themed wrapper `components/AppSwitch.tsx` that sets `trackColor={{ true: colors.primary, false: colors.border }}` and `thumbColor={colors.surface}`, and swap call sites). Commit: `feat(design): themed Switch using primary token`.

### Task A9: "My Lists" screen
- Modify: `app/index.tsx`
- Screen heading "My Lists" → `typography.display` or `h1` (Fredoka); "N lists" subtitle → `typography.body`/`bodyS` + `colors.textSecondary`. Remove Fraunces usage on this screen. Ensure it renders `EmptyState`/`ListCard` (already refactored). Commit: `feat(design): My Lists screen Fredoka headings + tokens`.

### Task A10: List-detail screen
- Modify: `app/list/[id]/index.tsx`
- List title header → Fredoka (`typography.h1`); any inline section labels → `typography.label`. Remove Fraunces on this screen. Commit: `feat(design): list detail screen Fredoka headings + tokens`.

### Task A11: Phase 2 verification sweep
- [ ] Run `npx tsc --noEmit` and `npx jest` — both green.
- [ ] `git grep -n "Fraunces" -- 'app/index.tsx' 'app/list/[id]/index.tsx' 'components/ListCard.tsx' 'components/Header.tsx'` → no matches (these are migrated; other screens are Phase 3).
- [ ] Commit any sweep fixes.

---

## Track D — Figma list-surface components

> Build on the `Components` page, below the foundation row (y ≥ 1200 to avoid overlap). Bind all colors/radii to variables; use text styles. Return node IDs; validate with `get_screenshot`. File key `dShBLjbHDWRDboNjtVq30K`. Load `figma-use` before each call.

### Task D1: List Card + List Item Row
- Build a **List Card** component: rounded (`radius/lg`) `surface` card with `Elevation/1`, a `Display/H2` (Fredoka) title, a `Body/Body S` count in `text-secondary`, an emoji slot. Build a **List Item Row**: `State`={Unchecked, Checked}; a circular checkbox (`primary` fill + check when checked, `border` stroke when unchecked), `Body/Body` label (checked → `text-muted`). Validate + return IDs.

### Task D2: Sub Item Row, Chips (suggestions), Switch, Header
- **Sub Item Row** (indented, `Body/Body S`). **Suggestion Chip** row (reuse Chip look). **Switch** (`On`/`Off`, track `primary`/`border`). **Header** (title `Display/H1`, leading/trailing icon slots). Validate + return IDs.

### Task D3: Assemble a sample "List" screen frame
- Compose a phone-width (375) frame using the new components (Header + a few List Item Rows + AddItem chip + FAB IconButton) bound to variables, in both a Light and a Dark instance (explicit modes), to showcase the surface. Screenshot both.

---

## Track E — Phase 2 close
- [ ] Browser verification (Claude runs it): launch expo web from the worktree (copy `.env` first; `npx expo start --web --port 8092`), open the "My Lists" and list-detail screens, confirm Fredoka headings + coral primary + card elevation render, no console errors. Capture screenshots.
- [ ] Commit any fixes. Do NOT merge — stack on branch; proceed to Phase 3.

## Self-review notes
- Spec coverage: all Phase-2 components from the spec's Phase 2 list (ListCard, ListItemRow, SubItemRow, ReorderableItemList, AddItemSuggestions, EmojiPickerButton, Switch, Header) + the two primary screens that surface them. M2 (card radius) resolved by standardizing cards on `radius.lg` (18) — matches the legacy `radii.card`; if the spec's "20" is still wanted, add a `radius` token in a follow-up.
- The recipe centralizes the typography/token mapping so tasks stay DRY; each task names its specific heading-token choice so there is no ambiguity.
