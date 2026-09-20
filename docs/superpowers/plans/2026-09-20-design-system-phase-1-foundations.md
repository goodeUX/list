# Design System — Phase 1: Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the refreshed token layer (color/type/space/radius/elevation) in code and Figma, wire it into `ThemeContext`, and refactor/create the foundation components — the vertical slice that proves the whole pipeline.

**Architecture:** Two-tier tokens (Primitives → Semantic) per the spec. In code, a new `lib/design/` module holds pure token objects; `contexts/ThemeContext.tsx` exposes them (keeping the existing `useTheme()` consumption pattern) with temporary legacy aliases so unrefactored screens keep working. In Figma, a `Primitives` variable collection and a `Semantic` collection (Light/Dark modes) back rebuilt foundation components. The two sides are kept in sync manually and linked with Code Connect.

**Tech Stack:** Expo SDK 57 / RN 0.86, TypeScript, jest (`jest-expo`), `@expo-google-fonts/*`, Figma Plugin API via `use_figma`.

**Reference:** [`docs/superpowers/specs/2026-09-20-design-system-design.md`](../specs/2026-09-20-design-system-design.md)

---

## Scope

Phase 1 only: the token foundations + these foundation components — **Button** (refactor), **ThemedTextInput** (refactor), **UserAvatar** (refactor), **EmptyState** (refactor), and new **IconButton**, **Divider**, **Badge**, **Chip**. Phases 2 (list surface) and 3 (overlays/flows) are separate plans written after Phase 1 merges.

## Conventions for this plan

- **Pure token modules are unit-tested with jest** (matches the repo's existing `lib/__tests__` pattern of testing plain logic/data).
- **Components and `ThemeContext` are verified by `npx tsc --noEmit`** plus Geoff's own on-device UI check — the repo has no component-render test harness and this plan does not invent one (per standing preference: typecheck + tests, then hand off UI verification).
- **Figma tasks** are verified with `get_metadata` (structure) and `get_screenshot` (visual), and must `return` all created/mutated node IDs.
- Run all commands from the worktree root `C:\Users\geoff\StudioProjects\list\.worktrees\design-system`.
- Figma file key: `dShBLjbHDWRDboNjtVq30K`. Every `use_figma` call passes `skillNames: "figma-use"` (load the `figma-use` skill first).

## File structure (created / modified in Phase 1)

**Code — created:**
- `lib/design/primitives.ts` — raw scales (color ramps, space, radius, font sizes/line-heights, font families)
- `lib/design/semantic.ts` — Light/Dark semantic role maps → primitives
- `lib/design/typography.ts` — text presets per token
- `lib/design/elevation.ts` — shadow presets per token
- `lib/design/index.ts` — barrel export
- `lib/design/__tests__/primitives.test.ts`, `semantic.test.ts`, `typography.test.ts`, `elevation.test.ts`
- `components/IconButton.tsx`, `components/Divider.tsx`, `components/Badge.tsx`, `components/Chip.tsx`

**Code — modified:**
- `package.json` — add `@expo-google-fonts/fredoka`
- `app/_layout.tsx` — load Fredoka fonts
- `contexts/ThemeContext.tsx` — expose new tokens + legacy aliases
- `lib/theme.ts` — re-export from `lib/design` (back-compat shim)
- `components/Button.tsx`, `components/ThemedTextInput.tsx`, `components/UserAvatar.tsx`, `components/EmptyState.tsx` — consume new tokens
- App-wide: rename `colors.accent`→`colors.primary`, `colors.accentSoft`→`colors.primarySoft`

**Figma — created:** `Primitives` + `Semantic` variable collections; `Display/…`,`Body/…` text styles; `Elevation/1..3` effect styles; rebuilt foundation components on a `Components` page; Code Connect maps.

---

## Track A — Code tokens

### Task A1: Add and load the Fredoka font

**Files:**
- Modify: `package.json`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Install the font package**

Run: `npm install @expo-google-fonts/fredoka`
Expected: adds `@expo-google-fonts/fredoka` to `dependencies`, exit 0.

- [ ] **Step 2: Import and register the Fredoka weights in `app/_layout.tsx`**

Add to the imports (near the Fraunces/Nunito imports at the top):

```tsx
import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
```

Add the three weights to the `useFonts({ ... })` map (alongside the existing entries):

```tsx
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app/_layout.tsx
git commit -m "feat(design): add and load Fredoka display font"
```

---

### Task A2: Primitive tokens

**Files:**
- Create: `lib/design/primitives.ts`
- Test: `lib/design/__tests__/primitives.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { palette, space, radius, fontSize, lineHeight, fontFamily } from '@/lib/design/primitives';

describe('primitives', () => {
  it('anchors each color family at step 500 (except sand)', () => {
    expect(palette.coral[500]).toBe('#FF6B5C');
    expect(palette.teal[500]).toBe('#2FA29B');
    expect(palette.butter[500]).toBe('#FFC24B');
    expect(palette.green[500]).toBe('#4CA167');
    expect(palette.red[500]).toBe('#D2322F');
    expect(palette.sand[900]).toBe('#2B2018');
    expect(palette.sand[50]).toBe('#FFF8EF');
  });

  it('exposes every ramp step 50..900', () => {
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    for (const fam of [palette.coral, palette.teal, palette.butter, palette.green, palette.red]) {
      for (const s of steps) expect(fam[s as keyof typeof fam]).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('has matching keys for fontSize and lineHeight', () => {
    expect(Object.keys(fontSize)).toEqual(Object.keys(lineHeight));
  });

  it('exposes the spacing, radius and font-family scales', () => {
    expect(space[4]).toBe(16);
    expect(radius.md).toBe(14);
    expect(radius.full).toBe(999);
    expect(fontFamily.displayBold).toBe('Fredoka_700Bold');
    expect(fontFamily.bodyRegular).toBe('NunitoSans_400Regular');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/design/__tests__/primitives.test.ts`
Expected: FAIL — cannot find module `@/lib/design/primitives`.

- [ ] **Step 3: Write `lib/design/primitives.ts`**

```ts
export const palette = {
  coral: { 50: '#FFF0EE', 100: '#FFDAD5', 200: '#FFB8AF', 300: '#FF9488', 400: '#FF7C6E', 500: '#FF6B5C', 600: '#ED5546', 700: '#C8412F', 800: '#9E3326', 900: '#6E2117' },
  sand: { 0: '#FFFFFF', 50: '#FFF8EF', 100: '#F3EDE4', 200: '#E9E0D3', 300: '#E5DDD0', 400: '#D8CCBB', 500: '#B9AB98', 600: '#8A7F72', 700: '#6B5E4F', 800: '#4A4034', 900: '#2B2018' },
  teal: { 50: '#E6F5F3', 100: '#C4E8E4', 200: '#93D5CF', 300: '#5FC0B8', 400: '#3DAFA6', 500: '#2FA29B', 600: '#268780', 700: '#1F6D67', 800: '#17524E', 900: '#0F3734' },
  butter: { 50: '#FFF7E6', 100: '#FFECC2', 200: '#FFDD93', 300: '#FFD065', 400: '#FFC957', 500: '#FFC24B', 600: '#EDAB2E', 700: '#C98A1E', 800: '#9E6C15', 900: '#6E4A0E' },
  green: { 50: '#EAF5EE', 100: '#CBE8D4', 200: '#A3D6B3', 300: '#77C08F', 400: '#5CAF78', 500: '#4CA167', 600: '#3C8654', 700: '#2F6B43', 800: '#235133', 900: '#163622' },
  red: { 50: '#FCECEA', 100: '#F8CFCC', 200: '#F0A29D', 300: '#E66E68', 400: '#DB4A44', 500: '#D2322F', 600: '#B22826', 700: '#8F1F1E', 800: '#6B1817', 900: '#47100F' },
} as const;

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, full: 999 } as const;

export const fontSize = { display: 34, h1: 28, h2: 22, title: 18, bodyL: 17, body: 15, bodyS: 13, label: 15, caption: 12 } as const;

export const lineHeight = { display: 40, h1: 34, h2: 28, title: 24, bodyL: 26, body: 22, bodyS: 18, label: 20, caption: 16 } as const;

export const fontFamily = {
  displayBold: 'Fredoka_700Bold',
  displaySemiBold: 'Fredoka_600SemiBold',
  displayMedium: 'Fredoka_500Medium',
  bodyRegular: 'NunitoSans_400Regular',
  bodySemiBold: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/design/__tests__/primitives.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/design/primitives.ts lib/design/__tests__/primitives.test.ts
git commit -m "feat(design): primitive color/space/radius/type tokens"
```

---

### Task A3: Semantic tokens (Light/Dark)

**Files:**
- Create: `lib/design/semantic.ts`
- Test: `lib/design/__tests__/semantic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { semantic } from '@/lib/design/semantic';
import { palette } from '@/lib/design/primitives';

describe('semantic tokens', () => {
  it('defines identical role keys for light and dark', () => {
    expect(Object.keys(semantic.light).sort()).toEqual(Object.keys(semantic.dark).sort());
  });

  it('maps core roles to the locked values in light mode', () => {
    expect(semantic.light.bg).toBe(palette.sand[50]);
    expect(semantic.light.surface).toBe(palette.sand[0]);
    expect(semantic.light.text).toBe(palette.sand[900]);
    expect(semantic.light.primary).toBe(palette.coral[500]);
    expect(semantic.light.primaryPressed).toBe(palette.coral[600]);
    expect(semantic.light.danger).toBe(palette.red[500]);
    expect(semantic.light.accent).toBe(palette.butter[500]);
    expect(semantic.light.onPrimary).toBe('#FFFFFF');
  });

  it('keeps primary distinct from danger in both modes', () => {
    expect(semantic.light.primary).not.toBe(semantic.light.danger);
    expect(semantic.dark.primary).not.toBe(semantic.dark.danger);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/design/__tests__/semantic.test.ts`
Expected: FAIL — cannot find module `@/lib/design/semantic`.

- [ ] **Step 3: Write `lib/design/semantic.ts`**

```ts
import { palette } from './primitives';

export type SemanticColors = {
  bg: string; surface: string; surfaceMuted: string; surfaceRaised: string;
  text: string; textSecondary: string; textMuted: string;
  border: string; borderStrong: string;
  primary: string; primaryPressed: string; primarySoft: string; onPrimary: string;
  secondary: string; accent: string;
  success: string; danger: string; dangerSoft: string;
  scrim: string;
};

export const semantic: { light: SemanticColors; dark: SemanticColors } = {
  light: {
    bg: palette.sand[50], surface: palette.sand[0], surfaceMuted: palette.sand[100], surfaceRaised: palette.sand[0],
    text: palette.sand[900], textSecondary: palette.sand[700], textMuted: palette.sand[600],
    border: palette.sand[300], borderStrong: palette.sand[400],
    primary: palette.coral[500], primaryPressed: palette.coral[600], primarySoft: palette.coral[100], onPrimary: '#FFFFFF',
    secondary: palette.teal[500], accent: palette.butter[500],
    success: palette.green[500], danger: palette.red[500], dangerSoft: palette.red[50],
    scrim: 'rgba(43,32,24,0.5)',
  },
  dark: {
    bg: '#1A1612', surface: '#252019', surfaceMuted: '#2E2820', surfaceRaised: '#2E2820',
    text: '#F5F0E8', textSecondary: '#A89B8C', textMuted: '#7E7365',
    border: '#3D352C', borderStrong: '#4A4034',
    primary: palette.coral[400], primaryPressed: palette.coral[500], primarySoft: '#3D2A26', onPrimary: '#FFFFFF',
    secondary: palette.teal[400], accent: palette.butter[400],
    success: '#7DB88E', danger: '#E06A5E', dangerSoft: '#3D211F',
    scrim: 'rgba(0,0,0,0.6)',
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/design/__tests__/semantic.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/design/semantic.ts lib/design/__tests__/semantic.test.ts
git commit -m "feat(design): semantic light/dark role tokens"
```

---

### Task A4: Typography presets

**Files:**
- Create: `lib/design/typography.ts`
- Test: `lib/design/__tests__/typography.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { typography } from '@/lib/design/typography';

describe('typography', () => {
  it('exposes every token with family, size and line height', () => {
    const tokens = ['display', 'h1', 'h2', 'title', 'bodyL', 'body', 'bodyS', 'label', 'caption'] as const;
    for (const t of tokens) {
      expect(typography[t].fontFamily).toBeTruthy();
      expect(typography[t].fontSize).toBeGreaterThan(0);
      expect(typography[t].lineHeight).toBeGreaterThan(0);
    }
  });

  it('uses Fredoka for headings and Nunito Sans for body', () => {
    expect(typography.h1.fontFamily).toBe('Fredoka_700Bold');
    expect(typography.h2.fontFamily).toBe('Fredoka_600SemiBold');
    expect(typography.body.fontFamily).toBe('NunitoSans_400Regular');
    expect(typography.label.fontFamily).toBe('NunitoSans_600SemiBold');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/design/__tests__/typography.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `lib/design/typography.ts`**

```ts
import type { TextStyle } from 'react-native';
import { fontFamily, fontSize, lineHeight } from './primitives';

export const typography = {
  display: { fontFamily: fontFamily.displayBold, fontSize: fontSize.display, lineHeight: lineHeight.display },
  h1: { fontFamily: fontFamily.displayBold, fontSize: fontSize.h1, lineHeight: lineHeight.h1 },
  h2: { fontFamily: fontFamily.displaySemiBold, fontSize: fontSize.h2, lineHeight: lineHeight.h2 },
  title: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.title, lineHeight: lineHeight.title },
  bodyL: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.bodyL, lineHeight: lineHeight.bodyL },
  body: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.body, lineHeight: lineHeight.body },
  bodyS: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.bodyS, lineHeight: lineHeight.bodyS },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.label, lineHeight: lineHeight.label },
  caption: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.caption, lineHeight: lineHeight.caption },
} as const satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/design/__tests__/typography.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/design/typography.ts lib/design/__tests__/typography.test.ts
git commit -m "feat(design): typography presets"
```

---

### Task A5: Elevation presets

**Files:**
- Create: `lib/design/elevation.ts`
- Test: `lib/design/__tests__/elevation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { elevation } from '@/lib/design/elevation';

describe('elevation', () => {
  it('defines e1..e3 with a warm shadow color', () => {
    for (const t of ['e1', 'e2', 'e3'] as const) {
      expect(elevation[t].shadowColor).toBe('#2B2018');
      expect((elevation[t].shadowOffset as { height: number }).height).toBeGreaterThan(0);
      expect(elevation[t].shadowRadius).toBeGreaterThan(0);
      expect(elevation[t].shadowOpacity).toBeGreaterThan(0);
    }
  });

  it('increases depth from e1 to e3', () => {
    expect(elevation.e1.shadowRadius!).toBeLessThan(elevation.e3.shadowRadius!);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/design/__tests__/elevation.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `lib/design/elevation.ts`**

```ts
import { Platform, type ViewStyle } from 'react-native';

function shadow(height: number, radius: number, opacity: number, androidElevation: number): ViewStyle {
  return {
    shadowColor: '#2B2018',
    shadowOffset: { width: 0, height },
    shadowRadius: radius,
    shadowOpacity: opacity,
    ...(Platform.OS === 'android' ? { elevation: androidElevation } : null),
  };
}

export const elevation = {
  e1: shadow(1, 3, 0.06, 1),
  e2: shadow(4, 12, 0.1, 4),
  e3: shadow(12, 28, 0.16, 12),
} as const;

export type ElevationToken = keyof typeof elevation;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/design/__tests__/elevation.test.ts`
Expected: PASS (2 tests). (Note: `jest-expo` defaults `Platform.OS` to `ios`, so `elevation` is omitted — the test does not assert it.)

- [ ] **Step 5: Commit**

```bash
git add lib/design/elevation.ts lib/design/__tests__/elevation.test.ts
git commit -m "feat(design): warm-tinted elevation presets"
```

---

### Task A6: Barrel export

**Files:**
- Create: `lib/design/index.ts`

- [ ] **Step 1: Write `lib/design/index.ts`**

```ts
export { palette, space, radius, fontSize, lineHeight, fontFamily } from './primitives';
export { semantic, type SemanticColors } from './semantic';
export { typography, type TypographyToken } from './typography';
export { elevation, type ElevationToken } from './elevation';
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/design/index.ts
git commit -m "feat(design): barrel export for design tokens"
```

---

## Track B — Wire tokens into ThemeContext

### Task B1: Expose new tokens with legacy aliases

**Files:**
- Modify: `contexts/ThemeContext.tsx`
- Modify: `lib/theme.ts`

- [ ] **Step 1: Turn `lib/theme.ts` into a back-compat shim**

Replace the entire contents of `lib/theme.ts` with:

```ts
import { semantic, radius, space } from './design';

// Back-compat shim. Prefer importing from '@/lib/design'. Removed once
// all consumers use the new tokens.
export const colors = { light: semantic.light, dark: semantic.dark } as const;

export const radii = { card: radius.lg, item: radius.md, checkbox: 8, fab: radius.lg } as const;
export const spacing = { xs: space[1], sm: space[2], md: space[4], lg: space[6], xl: space[8] } as const;

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeColors = (typeof semantic)['light'];
```

- [ ] **Step 2: Expand `ThemeContext` value**

In `contexts/ThemeContext.tsx`, add imports:

```tsx
import { radius, space, typography, elevation } from '@/lib/design';
```

Extend the `ThemeContextValue` type with the new fields (keep the existing ones):

```tsx
type ThemeContextValue = {
  colors: ThemeColors;
  radii: typeof radii;
  spacing: typeof spacing;
  radius: typeof radius;
  space: typeof space;
  typography: typeof typography;
  elevation: typeof elevation;
  colorScheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};
```

Add `radius`, `space`, `typography`, `elevation` to the `useMemo` value object (they are static, so no new deps needed):

```tsx
  const value = useMemo(
    () => ({
      colors: colors[colorScheme],
      radii,
      spacing,
      radius,
      space,
      typography,
      elevation,
      colorScheme,
      preference,
      setPreference,
    }),
    [colorScheme, preference, setPreference],
  );
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (Existing components still compile: `colors.bg/surface/text/...` keys are unchanged; `radii`/`spacing` aliases preserved.)

- [ ] **Step 4: Run the full test suite (no regressions)**

Run: `npx jest`
Expected: PASS (all existing suites + the four new token suites).

- [ ] **Step 5: Commit**

```bash
git add contexts/ThemeContext.tsx lib/theme.ts
git commit -m "feat(design): expose design tokens via ThemeContext with legacy aliases"
```

---

### Task B2: Rename `accent` → `primary` app-wide

The old palette used `accent` as the main action color (terracotta). In the new
system `accent` means the butter-yellow accent and `primary` is the coral action
color. Every existing `colors.accent` / `colors.accentSoft` reference must move to
`colors.primary` / `colors.primarySoft`.

**Files:**
- Modify: every file matching the search below (excludes `lib/design/**` and `lib/theme.ts`).

- [ ] **Step 1: Find all references**

Run: `git grep -n "colors\.accentSoft\|colors\.accent" -- ':!lib/design' ':!lib/theme.ts'`
Expected: a list of `.tsx`/`.ts` files (Button, ListCard, and others).

- [ ] **Step 2: Apply the rename**

For each hit, replace:
- `colors.accentSoft` → `colors.primarySoft`
- `colors.accent` → `colors.primary`

(Do `accentSoft` first so it is not partially matched by the `accent` pass.) Also update any destructures like `const { accent } = colors` → use `primary`, and any local variable/prop names only if they directly mirror the token (leave unrelated names alone).

- [ ] **Step 3: Verify no stale references remain**

Run: `git grep -n "colors\.accent\b\|colors\.accentSoft" -- ':!lib/design' ':!lib/theme.ts'`
Expected: no output.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(design): rename accent->primary to match new token roles"
```

---

## Track C — Foundation components

> All Track C component tasks share this verification: `npx tsc --noEmit` must pass, and the component is added to the Figma `Components` page in Track D. On-device visual verification is Geoff's (hand off a screenshot request at the end of Phase 1). Each task reads the current file first, then applies the changes.

### Task C1: Button — new tokens, typography, elevation

**Files:**
- Modify: `components/Button.tsx`
- Modify: `lib/buttonStyles.ts`

- [ ] **Step 1: Update `lib/buttonStyles.ts` to the new radius + label preset**

Replace `BUTTON_BORDER_RADIUS` value and `buttonLabelStyle` to use the token system:

```ts
import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { radius, fontFamily } from '@/lib/design';

export const BUTTON_HORIZONTAL_PADDING = Platform.OS === 'android' ? 20 : 16;

export const BUTTON_BORDER_RADIUS = radius.md; // 14 — rounder, playful

export const buttonLayoutStyle: ViewStyle = {
  alignItems: 'center',
  borderCurve: 'continuous',
  borderRadius: BUTTON_BORDER_RADIUS,
  justifyContent: 'center',
  paddingHorizontal: BUTTON_HORIZONTAL_PADDING,
  paddingVertical: 4,
};

export function buttonLabelStyle(fontSize: number): TextStyle {
  return {
    fontFamily: fontFamily.bodySemiBold,
    fontSize,
    lineHeight: Math.round(fontSize * 1.5),
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  };
}
```

- [ ] **Step 2: Point `components/Button.tsx` at `primary`/`primaryPressed` and add pressed elevation**

In `components/Button.tsx` the fill logic already reads `colors.accent` — after Task B2 it reads `colors.primary`. Make these specific changes:

- Pressed feedback: use `colors.primaryPressed` for the filled primary background when `pressed`. Replace the `backgroundColor` expression for the primary case:

```tsx
          backgroundColor: isPrimary
            ? (pressed ? colors.primaryPressed : colors.primary)
            : isDestructive
              ? colors.danger
              : isSurface
                ? colors.surface
                : undefined,
```

- Add a subtle raised shadow to filled + surface buttons using `elevation.e1`. Pull `elevation` from the hook (`const { colors, radii, elevation } = useTheme();`) and add it to the style array for filled/surface variants:

```tsx
        (isFilled || isSurface) ? elevation.e1 : null,
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/Button.tsx lib/buttonStyles.ts
git commit -m "feat(design): Button uses primary token, pressed state, elevation, radius.md"
```

---

### Task C2: Divider (new component)

**Files:**
- Create: `components/Divider.tsx`

- [ ] **Step 1: Write `components/Divider.tsx`**

```tsx
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type DividerProps = { inset?: number; style?: ViewStyle };

export default function Divider({ inset = 0, style }: DividerProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="none"
      style={[{ height: 1, backgroundColor: colors.border, marginHorizontal: inset }, style]}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/Divider.tsx
git commit -m "feat(design): Divider component"
```

---

### Task C3: Badge (new component)

**Files:**
- Create: `components/Badge.tsx`

- [ ] **Step 1: Write `components/Badge.tsx`**

```tsx
import { Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type BadgeTone = 'primary' | 'secondary' | 'success' | 'danger' | 'neutral';

const TONE_BG: Record<BadgeTone, 'primarySoft' | 'surfaceMuted' | 'dangerSoft'> = {
  primary: 'primarySoft',
  secondary: 'surfaceMuted',
  success: 'surfaceMuted',
  danger: 'dangerSoft',
  neutral: 'surfaceMuted',
};

const TONE_FG: Record<BadgeTone, 'primary' | 'secondary' | 'success' | 'danger' | 'textSecondary'> = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  danger: 'danger',
  neutral: 'textSecondary',
};

export default function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors, radius, typography } = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: colors[TONE_BG[tone]],
        borderRadius: radius.full,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text style={{ ...typography.caption, fontFamily: 'NunitoSans_600SemiBold', color: colors[TONE_FG[tone]] }}>
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/Badge.tsx
git commit -m "feat(design): Badge component with tones"
```

---

### Task C4: Chip (new component)

**Files:**
- Create: `components/Chip.tsx`

- [ ] **Step 1: Write `components/Chip.tsx`**

```tsx
import { Pressable, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type ChipProps = { label: string; selected?: boolean; onPress?: () => void };

export default function Chip({ label, selected = false, onPress }: ChipProps) {
  const { colors, radius, typography } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        backgroundColor: selected ? colors.primarySoft : colors.surfaceMuted,
        borderColor: selected ? colors.primary : 'transparent',
        borderRadius: radius.full,
        borderWidth: 1,
        opacity: pressed ? 0.85 : 1,
        paddingHorizontal: 14,
        paddingVertical: 8,
      })}
    >
      <Text style={{ ...typography.label, color: selected ? colors.primary : colors.text }}>{label}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/Chip.tsx
git commit -m "feat(design): Chip component with selected state"
```

---

### Task C5: IconButton (new component)

**Files:**
- Create: `components/IconButton.tsx`

- [ ] **Step 1: Write `components/IconButton.tsx`**

```tsx
import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type IconButtonVariant = 'surface' | 'ghost' | 'primary';

type IconButtonProps = {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  variant?: IconButtonVariant;
  accessibilityLabel: string;
  disabled?: boolean;
  size?: number;
};

export default function IconButton({
  icon,
  onPress,
  variant = 'surface',
  accessibilityLabel,
  disabled = false,
  size = 40,
}: IconButtonProps) {
  const { colors, radius, elevation } = useTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const bg = isPrimary ? colors.primary : isGhost ? 'transparent' : colors.surface;
  const fg = isPrimary ? colors.onPrimary : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: bg,
          borderRadius: radius.full,
          height: size,
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          width: size,
        },
        !isGhost ? elevation.e1 : null,
      ]}
    >
      <MaterialIcons color={fg} name={icon} size={Math.round(size * 0.55)} />
    </Pressable>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/IconButton.tsx
git commit -m "feat(design): IconButton component"
```

---

### Task C6: ThemedTextInput — tokens, typography, focus/error states

**Files:**
- Modify: `components/ThemedTextInput.tsx`

- [ ] **Step 1: Read the current file**

Run: `sed -n '1,200p' components/ThemedTextInput.tsx` (or open it). Note how it currently styles the container/border and text.

- [ ] **Step 2: Apply the token mapping**

Make these substitutions in the component's styles (keep existing prop API and behavior):
- Container background → `colors.surface`
- Border color → `colors.border`; when focused → `colors.primary`; when `error` (add an optional `error?: boolean` prop) → `colors.danger`
- Border radius → `radius.md`
- Input text style → spread `typography.body` and set `color: colors.text`
- Placeholder color → `colors.textMuted`
- Horizontal padding → `space[4]` (16), vertical → `space[3]` (12)

Add focus tracking if not present:

```tsx
const [focused, setFocused] = useState(false);
// onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
// borderColor: error ? colors.danger : focused ? colors.primary : colors.border
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/ThemedTextInput.tsx
git commit -m "feat(design): ThemedTextInput tokens + focus/error states"
```

---

### Task C7: UserAvatar — tokens + sizes

**Files:**
- Modify: `components/UserAvatar.tsx`

- [ ] **Step 1: Read the current file**

Run: `sed -n '1,200p' components/UserAvatar.tsx`. Note how size and background/initials are handled.

- [ ] **Step 2: Apply the token mapping**

- Fallback/background → `colors.primarySoft`; initials text color → `colors.primary`.
- Border radius → `radius.full`.
- Ensure a `size` prop exists with default `40`; initials font → `typography.label` scaled to size (`fontSize: Math.round(size * 0.4)`), family `NunitoSans_700Bold`.
- Any hardcoded border color → `colors.border`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/UserAvatar.tsx
git commit -m "feat(design): UserAvatar tokens + size prop"
```

---

### Task C8: EmptyState — tokens + typography

**Files:**
- Modify: `components/EmptyState.tsx`

- [ ] **Step 1: Read the current file**

Run: `sed -n '1,200p' components/EmptyState.tsx`.

- [ ] **Step 2: Apply the token mapping**

- Title text → spread `typography.h2`, `color: colors.text`.
- Body/subtitle text → spread `typography.body`, `color: colors.textSecondary`.
- Any icon tint → `colors.textMuted`.
- Vertical rhythm → `space[3]`/`space[4]` gaps.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Run full suite**

Run: `npx jest`
Expected: PASS (no regressions).

- [ ] **Step 5: Commit**

```bash
git add components/EmptyState.tsx
git commit -m "feat(design): EmptyState typography + tokens"
```

---

## Track D — Figma foundations (parallel to Tracks A–C)

> Load the `figma-use` skill before every `use_figma` call. Work incrementally (≤10 logical ops per call), `return` all created node IDs, validate with `get_metadata` / `get_screenshot`. File key `dShBLjbHDWRDboNjtVq30K`.

### Task D1: Primitives variable collection

- [ ] **Step 1: Create the `Primitives` collection with one mode**

Write a `use_figma` script that creates a variable collection named `Primitives` (single mode, rename its default mode to `Value`). For each color family in the spec (`coral`, `sand`, `teal`, `butter`, `green`, `red`), create a `COLOR` variable per step named `color/<family>/<step>` (e.g. `color/coral/500`), value from the hex map in `lib/design/primitives.ts`, `scopes: ['ALL_FILLS','FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR']`. Return `{ collectionId, createdCount }`.

Split across ~3 calls (two families per call) to stay within the op budget. Convert hex→{r,g,b} in 0–1 range.

- [ ] **Step 2: Add the numeric scales**

In a follow-up call, add `FLOAT` variables: `space/0..12` (scope `['GAP','WIDTH_HEIGHT']`), `radius/sm|md|lg|xl|full` (scope `['CORNER_RADIUS']`), `font-size/<token>` and `line-height/<token>` (scope `['FONT_SIZE','LINE_HEIGHT']`). Values from `primitives.ts`.

- [ ] **Step 3: Validate**

Run `get_metadata` on the file and confirm the `Primitives` collection variable count matches (60 colors + 11 space + 5 radius + 9 font-size + 9 line-height = 94). Return the counts.

---

### Task D2: Semantic variable collection (Light/Dark)

- [ ] **Step 1: Create the `Semantic` collection with `Light` and `Dark` modes**

Create a collection `Semantic`; rename mode 1 to `Light`, add mode `Dark`. For each role in the spec's semantic table, create a `COLOR` variable named `<role>` (e.g. `primary`, `primary-pressed`, `on-primary`). Set each mode's value by **aliasing** the matching `Primitives` variable where the spec references a ramp step (use `figma.variables.setValueForMode(v, modeId, { type: 'VARIABLE_ALIAS', id: primitiveVarId })`); for raw hex roles (dark-mode neutrals, `scrim`) set a literal color. Scope to fills/strokes/text as appropriate. Return `{ collectionId, createdCount }`.

Split across ~3 calls (roles grouped). Keep a name→id map of Primitives variables from Task D1 (re-read with `getLocalVariablesAsync` at the start of each call).

- [ ] **Step 2: Validate**

Confirm `Light`/`Dark` modes exist and every semantic variable resolves in both modes (no unset). `get_screenshot` a quick swatch frame bound to `bg`/`surface`/`primary`/`danger` in each mode to eyeball it. Return counts.

---

### Task D3: Text styles + elevation effect styles

- [ ] **Step 1: Create text styles**

For each typography token, create a text style named `Display/Display`, `Display/H1`, `Display/H2`, `Display/Title`, `Body/Body L`, `Body/Body`, `Body/Body S`, `Body/Label`, `Body/Caption` with the family/size/line-height from `typography.ts`. Load each font (`Fredoka` Medium/SemiBold/Bold, `Nunito Sans` Regular/SemiBold) before setting. Return style IDs.

- [ ] **Step 2: Create elevation effect styles**

Create `Elevation/1..3` effect styles matching `elevation.ts` (drop shadow, color `#2B2018` at the token opacity, offset y, blur = shadowRadius). Return style IDs.

---

### Task D4: Rebuild foundation components on a `Components` page

- [ ] **Step 1: Create the `Components` page and Button component set**

Create a page `Components`. Build a `Button` `COMPONENT_SET` with a `Variant` property = {Primary, Secondary, Surface, Ghost, Destructive} and a `State` property = {Default, Pressed, Disabled, Loading}, using auto-layout, bound to `Semantic` variables (`primary`/`on-primary`/`surface`/`border`/`danger`), `radius/md` corner, `Body/Label` text style, `Elevation/1` on filled/surface. Set `node.description` on the set. Return the set ID.

- [ ] **Step 2: Build the remaining foundation components**

Repeat the pattern (one `use_figma` call each, validate with `get_screenshot`) for: `Icon Button` (variants surface/ghost/primary), `Text Field` (default/focused/error/disabled — reuse/upgrade the existing `Text Field` set at `18:1196`), `Avatar` (sizes; upgrade existing `18:823`), `Divider` (upgrade existing `30:1649`), `Badge` (tones), `Chip` (default/selected), `Empty State`. Bind every color/spacing/radius to variables — no hardcoded values.

- [ ] **Step 3: Validate the page**

`get_screenshot` the `Components` page. Confirm all variants render, nothing is clipped, tokens resolve. Return node IDs.

---

### Task D5: Code Connect for foundation components

- [ ] **Step 1: Map each Figma component to its code file**

Using the `figma-code-connect` skill, add Code Connect maps: `Button`→`components/Button.tsx`, `Icon Button`→`components/IconButton.tsx`, `Text Field`→`components/ThemedTextInput.tsx`, `Avatar`→`components/UserAvatar.tsx`, `Divider`→`components/Divider.tsx`, `Badge`→`components/Badge.tsx`, `Chip`→`components/Chip.tsx`, `Empty State`→`components/EmptyState.tsx`. Return the mapping confirmations.

---

## Track E — Phase 1 integration & handoff

### Task E1: Full verification

- [ ] **Step 1: Typecheck + tests**

Run: `npx tsc --noEmit && npx jest`
Expected: both PASS.

- [ ] **Step 2: Archive exploration pages in Figma**

Rename the `🎨 Palette Explorations` and `🔤 Type Explorations` pages with an `[archive]` prefix (or move to the bottom). Leave the existing `UI Library` page intact for reference. Return page IDs.

- [ ] **Step 3: Hand off on-device verification to Geoff**

Post a summary + request that Geoff run the app (`npx expo run:android`) and confirm the refreshed Button/inputs/list foundations look right. Do NOT self-verify in a browser.

- [ ] **Step 4: Merge decision**

Once Geoff signs off, follow the `finishing-a-development-branch` skill to merge Phase 1 (or keep the branch open for Phases 2–3). Do not merge to `main` without sign-off.

---

## Self-review notes

- **Spec coverage:** token architecture (A2–A6, D1–D2), color (A2–A3, D1–D2), typography (A1, A4, D3), shape/spacing/elevation (A2, A5, D3), foundation components (C1–C8, D4), code structure (A2–A6, B1), Figma structure + Code Connect (D1–D5), verification (E1), reversibility (worktree/branch, E1 Step 4). Phase 2/3 components are explicitly deferred to their own plans.
- **Naming consistency:** `primary`/`primaryPressed`/`primarySoft`/`onPrimary`, `accent` (butter), `danger`/`dangerSoft` are used identically in code (`semantic.ts`), tests, and the Figma role names (`primary`, `primary-pressed`, `on-primary`, dot-form).
- **No placeholders:** token files, ThemeContext edits, and the four new components ship complete code; the four refactor tasks (C1, C6–C8) give exact token maps and read the current file first (avoids guessing unread source verbatim).
