import { space } from '@/lib/design';

// Checkbox sizing shared by list items and their sub-items, on the list page
// and the edit item page, so they all line up the same way.

export const ITEM_CHECKBOX_SIZE = 22;
export const ITEM_CHECKBOX_ICON_SIZE = 14;
// The list page centres an item's checkbox in a larger tap target.
export const ITEM_CHECKBOX_HIT_SIZE = 44;
/** The row gap between an item's checkbox tap target and its name. */
export const ITEM_ROW_GAP = space[3];

/**
 * The visible space between an item's checkbox and its name: the tap
 * target's margin around the checkbox plus the row gap. Rows whose checkbox
 * has no enlarged tap target use this as their gap to match.
 */
export const ITEM_CHECKBOX_TEXT_GAP =
  (ITEM_CHECKBOX_HIT_SIZE - ITEM_CHECKBOX_SIZE) / 2 + ITEM_ROW_GAP;
