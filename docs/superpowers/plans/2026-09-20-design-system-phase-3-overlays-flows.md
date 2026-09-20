# Design System — Phase 3: Overlays & Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Complete the identity refresh across every remaining surface — modals, sheets, menus, the auth journey, and all remaining screens — and retire the old Fraunces font once nothing uses it.

**Architecture:** Same as Phases 1–2. Apply the shared migration recipe (below, copied from Phase 2 so this plan is self-contained) to each remaining component/screen. Build the key overlay patterns (Modal, Menu, Bottom Sheet) in Figma.

**Tech Stack:** Expo SDK 57 / RN 0.86, TypeScript, jest, Figma Plugin API.

**Branch:** `design-system-refresh` — do NOT merge; stack on the branch. This is the final phase before the whole-branch review.

---

## Shared migration recipe (apply in every Track A task)

Read the current file, then:

1. **Headings/titles** in **Fraunces** or large display text → nearest **Fredoka** `typography` token by size: ≥30→`display`, 26–30→`h1`, 20–25→`h2`, 17–19→`title`. Apply as `style={[typography.h2, { color: colors.text }]}`.
2. **Body/label/caption** (Nunito Sans) → matching token: 17→`bodyL`, 15→`body`, 13→`bodyS`, semibold-15→`label`, 12→`caption`.
3. **Colors** → semantic roles (`colors.*`); no raw themeable hex.
4. **Radius** → `radius.*`. Modals/sheets → `radius.xl`; menus/cards → `radius.lg`; rows/inputs → `radius.md`; pills → `radius.full`.
5. **Spacing** → `space[n]` where a hardcoded value matches a step.
6. **Elevation** → modals/sheets `elevation.e3`; menus/popovers `elevation.e2`.
7. **Scrim/overlay** backgrounds → `colors.scrim`.
8. Preserve all props, behavior, a11y, animation, and layout. Restyle only.

**Verification per task:** `npx tsc --noEmit` passes; `npx jest` stays green (237). Commit per task, trailer:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Track A — Component & screen migration

### Modals & alerts
- **A1** `components/AppAlertModal.tsx` — dialog surface `radius.xl` + `elevation.e3`, backdrop `colors.scrim`, title `typography.h2`, body `typography.body`, actions use `Button`. Commit `feat(design): AppAlertModal tokens`.
- **A2** `components/AppAlertHost.tsx` — ensure it passes through the themed modal; scrim `colors.scrim`. Commit `feat(design): AppAlertHost scrim token`.
- **A3** `components/BenefitsModal.tsx` — title `typography.h2`, benefit rows `typography.body`, icons `colors.primary`, CTA `Button`. Commit `feat(design): BenefitsModal tokens`.
- **A4** `components/SignInBenefitsModal.tsx` — same recipe. Commit `feat(design): SignInBenefitsModal tokens`.
- **A5** `components/UpgradePromptModal.tsx` — same recipe. Commit `feat(design): UpgradePromptModal tokens`.
- **A6** `components/ListFormModal.tsx` — sheet surface `radius.xl`+`elevation.e3`, inputs via `ThemedTextInput`, title `typography.h2`. Commit `feat(design): ListFormModal tokens`.
- **A7** `components/ChooseEditableListsModal.tsx` — same recipe; rows use `List Item Row` visual language. Commit `feat(design): ChooseEditableListsModal tokens`.

### Sheets & menus
- **A8** `components/EmojiPickerSheet.tsx` — bottom sheet `radius.xl`(top corners)+`elevation.e3`, handle `colors.borderStrong`, title `typography.title`. Commit `feat(design): EmojiPickerSheet tokens`.
- **A9** `components/ListOptionsMenu.tsx` — popover `radius.lg`+`elevation.e2`, items `typography.body`, destructive item `colors.danger`. Commit `feat(design): ListOptionsMenu tokens`.
- **A10** `components/ListSortMenu.tsx` — same menu recipe; selected item `colors.primary`. Commit `feat(design): ListSortMenu tokens`.

### Flows & standalone
- **A11** `components/ShareListContent.tsx` — headings Fredoka (`typography.h2`), body `typography.body`, share button `Button`. Commit `feat(design): ShareListContent tokens`.
- **A12** `components/JoinInviteLanding.tsx` — hero heading `typography.h1`, body `typography.body`, CTA `Button`. Commit `feat(design): JoinInviteLanding tokens`.
- **A13** `components/OpeningScreen.tsx` — wordmark/heading → Fredoka (`typography.display`); keep the animation. Commit `feat(design): OpeningScreen Fredoka wordmark`.
- **A14** `components/auth/AuthJourney.tsx` — screen headings `typography.h1`, body `typography.body`, inputs `ThemedTextInput`, CTAs `Button`. Commit `feat(design): AuthJourney tokens`.
- **A15** `components/auth/BiometricGate.tsx` — heading `typography.h2`, body `typography.body`. Commit `feat(design): BiometricGate tokens`.
- **A16** `components/auth/SocialAuthButtons.tsx` — buttons via `Button`/token surfaces; keep provider branding colors (Google/Apple) as-is (not themeable). Commit `feat(design): SocialAuthButtons tokens`.

### Remaining screens
- **A17** `app/settings/index.tsx`, `app/settings/profile.tsx`, `app/settings/security.tsx` — section titles `typography.h1`/`title`, rows `typography.body`, use themed `Switch`/`Divider`. One commit per file: `feat(design): settings <name> screen tokens`.
- **A18** `app/(auth)/paywall.tsx`, `app/(auth)/choose-plan.tsx` — plan headings Fredoka, price emphasis `typography.h1`, CTAs `Button`. One commit per file.
- **A19** `app/import/index.tsx` — heading `typography.h1`, body `typography.body`. Commit.
- **A20** `app/+not-found.tsx` — heading `typography.h1`. Commit.
- **A21** `app/list/[id]/item/[itemId].tsx`, `app/list/[id]/share.tsx` — headings Fredoka, body tokens. One commit per file.

### Retire Fraunces
- **A22** — When no code references Fraunces:
  - [ ] `git grep -n "Fraunces" -- 'app' 'components' 'lib'` → must be empty (docs may still mention it).
  - [ ] Remove the three `Fraunces_*` imports and `useFonts` entries from `app/_layout.tsx`.
  - [ ] `npm uninstall @expo-google-fonts/fraunces`.
  - [ ] `npx tsc --noEmit` + `npx jest` green.
  - [ ] Commit `chore(design): remove Fraunces font now that all screens use Fredoka`.

### Verification sweep
- **A23** — `npx tsc --noEmit` + `npx jest` green; `git grep -n "Fraunces" -- 'app' 'components' 'lib'` empty. Commit any fixes.

---

## Track D — Figma overlay patterns

> On the `Components` page, below the list-surface row (y ≥ 1800). Bind to variables, use text styles. Return IDs, validate with `get_screenshot`.

- **D1 Modal / Dialog** — `surface` card `radius/xl` + `Elevation/3` over a `scrim` backdrop; `Display/H2` title, `Body/Body` text, primary + ghost Button instances.
- **D2 Menu** — `surface` popover `radius/lg` + `Elevation/2`; 3 rows (`Body/Body`), a `Divider`, one destructive row (`danger`).
- **D3 Bottom Sheet** — top-rounded `radius/xl` `surface` + `Elevation/3`, grab handle (`border-strong`), `Display/Title` header, content slot.

---

## Track E — Phase 3 close & whole-branch review
- [ ] **Browser verification (Claude runs it):** expo web from the worktree; walk the main flows (My Lists → list detail → add item → a modal → settings → auth journey). Confirm Fredoka headings everywhere, coral primary, elevation/scrim, no console errors. Capture screenshots of several screens, light + (where possible) dark.
- [ ] Final whole-branch code review (dispatch `superpowers:code-reviewer` over `1f37f48..HEAD`); fix Critical/Important findings.
- [ ] Present the complete design system (code + Figma) to Geoff for review. Do NOT merge until he approves.

## Self-review notes
- Spec coverage: every remaining Phase-3 component from the spec plus all screens still on Fraunces (found via `git grep Fraunces`), and Fraunces retirement. Recipe centralizes the mapping (DRY). Provider-brand colors in SocialAuthButtons intentionally excluded from tokenization.
- After Phase 3, no code references Fraunces and every screen uses the token system — the identity refresh is complete across the app.
