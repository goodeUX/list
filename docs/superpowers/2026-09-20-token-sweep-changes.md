# Design-Token Sweep — Change List (2026-09-20)

Replaced hardcoded values in `app/` and `components/` with foundation tokens
(`space`, `radius`, `fontSize`, `lineHeight`, `fontFamily` from `@/lib/design`;
colors via `useTheme().colors`). tsc clean, 237 tests pass. 38 files touched.

**Token scales for reference**
- `space`: 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48
- `radius`: sm=8, md=12, lg=16, xl=24, full=999
- `fontSize` / `lineHeight`: display 32/40, h1 28/34, h2 24/28, title 18/24, bodyL 18/26, body 16/22, bodyS 14/18, label 16/20, caption 12/16

---

## ⚠️ Judgment calls worth your review

1. **`borderRadius: 22` → `radius.xl` (24)** on 11 back/share buttons (auth screens, import, list, item, share, settings ×3, ListOptionsMenu). Nearest token is 24 (closer than lg=16) → **+2px** rounder.
2. **Off-scale spacing rounded to nearest (ties round up)** — small 1–2px shifts:
   `6→8`, `10→12`, `14→16`, `15→16` (padding/gap/margin). Full list in Spacing below.
3. **`ListItemRow` progress badge (`done/total`) line-height `14 → 16`** — the `caption` token pairs 12/16, so this text's line-height grew 2px. Flag if 14 was intentionally tight.
4. **Left as-is (no matching token)** — see the section at the bottom: `borderRadius: 4`, several `gap: 2` (≤2 exempt), `paddingTop: 80`, `padding: 0`.
5. **Emoji/FAB glyph font sizes left untouched** (decorative, not text tokens): list-icon emoji (22–28), FAB `+` (40), emoji-picker cell (24–26).
6. **Import cleanup (behavior-neutral):** in 6 screens the batch moved `radius`/`space` from the `useTheme()` destructure to a direct `import { … } from '@/lib/design'` (needed at module scope for `StyleSheet.create`). Values are identical (`useTheme` re-exports the same objects).

---

## Colors
- `app/+html.tsx:39,43` — web splash `#DBB793` → `#FFF8EF` (static HTML/CSS; can't reference JS tokens, value corrected to the `bg` token's value)

## Font family
- `app/index.tsx:637` `'NunitoSans_700Bold'` → `fontFamily.bodyBold` (FAB glyph; size left)
- `app/join/[listId].tsx:166,173` `'NunitoSans_400Regular'` → `fontFamily.bodyRegular`
- `components/Badge.tsx:35` `'NunitoSans_600SemiBold'` → `fontFamily.bodySemiBold`
- `components/ListItemRow.tsx:352,365` `'NunitoSans_600SemiBold'` → `fontFamily.bodySemiBold`
- `components/ThemedTextInput.tsx:254` `'NunitoSans_400Regular'` → `fontFamily.bodyRegular`
- `components/UserAvatar.tsx:47` `'NunitoSans_700Bold'` → `fontFamily.bodyBold`

## Font size + line height
- `app/join/[listId].tsx:167-168,174-175` `16/24` → `fontSize.body / lineHeight.body`
- `app/settings/index.tsx:305,321` `buttonLabelStyle(16)` → `buttonLabelStyle(fontSize.body)`
- `components/ThemedTextInput.tsx:257-258` `12/16` → `fontSize.caption / lineHeight.caption`; `:261` `16` → `fontSize.body`
- `components/ListItemRow.tsx:354-355` `12/16` → `caption`; `:367-368` `12/14` → `caption` *(line-height 14→16, see judgment #3)*

## Radii
- `borderRadius: 22 → radius.xl` — `app/(auth)/choose-plan.tsx:167`, `sign-in.tsx:125`, `sign-up.tsx:132`, `import/index.tsx:375`, `list/[id]/index.tsx:1023`, `list/[id]/item/[itemId].tsx:651`, `list/[id]/share.tsx:107`, `settings/index.tsx:437`, `settings/profile.tsx:262`, `settings/security.tsx:296`, `components/ListOptionsMenu.tsx:300`
- `app/index.tsx:70` `FAB_BORDER_RADIUS = 24` → `radius.xl`
- `components/ListCard.tsx:87` `borderRadius: 8` → `radius.sm`
- `components/EmojiPickerSheet.tsx:45` `CATEGORY_ACTIVE_RADIUS = 8` → `radius.sm`

## Spacing (all `→ space[k]`)
**Main screens** — `app/index.tsx:592` marginBottom 12→[3]; `app/import/index.tsx:371,395` gap 12→[3], `:413` gap 10→[3]; `app/join/[listId].tsx:159` gap 16→[4]; `app/list/[id]/index.tsx` header gap 12→[3], titleBlock gap 10→[3], addInputRow gap 8→[2] / paddingLeft 15→[4] / paddingVertical 4→[1] / paddingRight ternary 12,15→[3],[4], addInput paddingVertical 7→[2], readOnlyBanner gap 8→[2], emptyList paddingHorizontal 24→[6], emptyText marginTop 16→[4]; `app/list/[id]/item/[itemId].tsx` header gap 12→[3], field gap 6→[2], limitError marginTop 6→[2], openLink marginTop 4→[1], subItemRow gap 10→[3]/paddingVertical 8→[2], subItemInput paddingVertical 6→[2]; `app/list/[id]/share.tsx:103` gap 12→[3]; `app/settings/index.tsx` header gap 12→[3], section gap 4→[1], themeOption gap 6→[2]/paddingHorizontal 12→[3]/paddingVertical 10→[3], planRow gap 10→[3], planBadge paddingHorizontal 10→[3]/paddingVertical 4→[1]; `app/settings/profile.tsx` header gap 12→[3], field gap 6→[2], labelRow gap 8→[2]; `app/settings/security.tsx` header gap 12→[3], appLockRow gap 12→[3], field gap 6→[2]
**Auth** — `choose-plan.tsx` marginBottom 8→[2]×2, gap 10→[3]; `paywall.tsx` marginBottom 8→[2], gap 10→[3]; `sign-in.tsx`/`sign-up.tsx` marginTop 24→[6]; `+not-found.tsx` padding 20→[5], marginTop 15→[4], paddingVertical 15→[4]
**Components (g1)** — AddItemSuggestions marginTop 6→[2], gap 4→[1]/padding 6→[2], paddingHorizontal 15→[4], gap 8→[2]; AppAlertModal paddingHorizontal 12→[3], gap 8→[2]×2; Badge paddingHorizontal 10→[3], paddingVertical 3→[1]; BenefitsModal paddingHorizontal 12→[3], gap 8→[2]/14→[4]/12→[3]/8→[2]; Button iconRow gap 8→[2]; Chip paddingHorizontal 14→[4], paddingVertical 8→[2]; ChooseEditableListsModal paddingHorizontal 12→[3], gap 8→[2]/10→[3]/8→[2]; EmojiPickerSheet CONTENT_HORIZONTAL_PADDING 12→[3], paddingBottom/Top 16→[4], searchField gap 8→[2]/paddingHorizontal 12→[3]/paddingVertical 8→[2], sectionHeader paddingHorizontal 12→[3]; EmptyState createListButton gap 8→[2]
**Components (g2)** — ListCard gap 12→[3]/6→[2]; ListFormModal overlayPaddingTop 24→[6] (state+Math.max), paddingBottom 24→[6], gap 4→[1], paddingRight 12→[3], paddingVertical 14→[4], marginLeft 8→[2], gap 8→[2]; ListItemRow offset +12→+[3], gap 12→[3]/4→[1]×2, paddingHorizontal 8→[2]/6→[2], marginTop -6→-[2], paddingBottom 14→[4]; ListOptionsMenu MENU_ITEM_HORIZONTAL_PADDING 14→[4]/MENU_ITEM_GAP 10→[3]/MENU_ANCHOR_GAP 8→[2]; ListSortMenu same three constants; OpeningScreen top+48→+[12], paddingHorizontal 32→[8], paddingTop 40→[10], marginTop 4→[1]; ReorderableItemList gap 8→[2], paddingHorizontal 6→[2]
**Components (g3)** — ShareListContent paddingHorizontal 14→[4]/paddingVertical 12→[3], gap 10→[3]; SubItemRow gap 10→[3]; ThemedTextInput paddingHorizontal 4→[1]; AuthJourney marginBottom 24→[6]/8→[2], gap 16→[4]/12→[3], marginTop 12→[3]; BiometricGate paddingTop 40→[10], marginTop 4→[1]/32→[8]/16→[4]; SocialAuthButtons gap 12→[3]/10→[3]

---

## No matching token (left as-is)
- `components/ShareListContent.tsx` `onlineDot.borderRadius: 4` — no radius token for 4
- `components/ShareListContent.tsx` `collaboratorDetails.gap: 2`, `components/auth/AuthJourney.tsx` `backRow.gap: 2`, `components/ListItemRow.tsx` `pill.paddingVertical: 2` / `subItems.gap: 2`, `app/list/[id]/index.tsx` `titleTextBlock.gap: 2`, `app/settings/security.tsx` `appLockLabels.gap: 2`, `components/EmojiPickerSheet.tsx` `searchInput.padding: 0` — ≤2, no scale step
- `components/OpeningScreen.tsx` `loadingContainer.paddingTop: 80` — >48, no near token

## Intentionally left (not design tokens)
- Emoji/FAB glyph font sizes; icon `size={N}` props; `width`/`height` dimensions (avatars, illustrations, hit areas, cell/menu sizes); `borderWidth` / `StyleSheet.hairlineWidth`; `zIndex`; Android `elevation`; opacity/animation values; web-only `boxShadow` strings; `'transparent'`; `MaterialSymbol` icon-glyph font; derived `borderRadius: X/2` (toggle track/thumb).
