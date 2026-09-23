import { space } from '@/lib/design';

// Checkbox sizing shared by list items and their sub-items, on the list page
// and the edit item page, so they all line up the same way.

export const ITEM_CHECKBOX_SIZE = 24;
export const ITEM_CHECKBOX_ICON_SIZE = 14;
/** Every checkbox's tap target, however it's provided. */
export const ITEM_CHECKBOX_HIT_SIZE = 48;
/** hitSlop that grows a bare checkbox to the full tap target on every side. */
export const ITEM_CHECKBOX_HIT_SLOP = (ITEM_CHECKBOX_HIT_SIZE - ITEM_CHECKBOX_SIZE) / 2;
/** The gap between the parts of an item row (tap target, name, badge, …). */
export const ITEM_ROW_GAP = space[3];

/**
 * The visible space between any checkbox and its name — items and
 * sub-items, everywhere. A checkbox's tap target is bigger than this leaves
 * room for, so the target overlaps the start of the name and must sit above
 * it (zIndex) to keep all of its 48px.
 */
export const ITEM_CHECKBOX_TEXT_GAP = space[4];

/**
 * Margin that pulls a centred 48px tap target in towards the name, so the
 * visible checkbox-to-name space is ITEM_CHECKBOX_TEXT_GAP despite the row's
 * ITEM_ROW_GAP.
 */
export const ITEM_CHECKBOX_HIT_OVERLAP =
  ITEM_CHECKBOX_TEXT_GAP - ITEM_ROW_GAP - (ITEM_CHECKBOX_HIT_SIZE - ITEM_CHECKBOX_SIZE) / 2;
