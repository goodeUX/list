import { semantic, radius, space } from './design';

// Back-compat shim. Prefer importing from '@/lib/design'. Removed once
// all consumers use the new tokens.
export const colors = { light: semantic.light, dark: semantic.dark } as const;

export const radii = { card: radius.lg, item: radius.md, checkbox: 8, fab: radius.lg } as const;
export const spacing = { xs: space[1], sm: space[2], md: space[4], lg: space[6], xl: space[8] } as const;

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeColors = (typeof semantic)['light'];
