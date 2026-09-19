# Sub-items — design

**Date:** 2026-09-19
**Status:** Approved, ready for planning

## Goal

Let a list item hold a lightweight checklist of **sub-items**. Sub-items are
name-only, independently checkable, reorderable, and shown collapsed under their
parent in the list view. They are managed on the item's Edit screen.

## Decisions (from brainstorming)

- **Shape:** lightweight — a sub-item is just a checkable name. No
  quantity/description/link, no detail page.
- **List display:** collapsible under the parent. The parent shows a progress
  badge and a chevron; tap the chevron to expand/collapse. Collapsed by default.
- **Check behavior:** independent. Checking a sub-item never touches the parent,
  and checking the parent never touches sub-items. The parent badge shows
  progress only.
- **Add/manage:** on the Edit item screen. The list view only displays, expands,
  and checks sub-items.
- **Progress badge:** yes — parent shows `done/total` (e.g. `2/3`).
- **Reorder:** yes — sub-items are drag-reorderable on the Edit item screen.

## Data model

Add a `subItems` array to each item document — `lists/{id}/items/{itemId}.subItems`
— and to locally stored items.

```ts
export interface SubItem {
  id: string;
  name: string;
  checked: boolean;
  order: number;
}

// ListItem gains:
//   subItems: SubItem[];   // defaults to [] for existing documents
```

`docToListItem` maps `data.subItems` to a validated `SubItem[]`, defaulting to
`[]` when the field is missing or malformed. **No migration** is required — a
missing field reads as an empty list.

### Why an array, not a subcollection

- The existing single `onSnapshot` in `useListItems` already delivers sub-items
  with their parent — no new listeners.
- Counts (`useListItemCounts`), suggestions, name history, and reorder all
  operate on top-level items and stay untouched. A subcollection would add a
  listener per parent and force each of those systems to filter children out.
- The local store already persists full item objects as an array, so `subItems`
  rides along with no new persistence path.

**Trade-off (accepted):** the whole `subItems` array is rewritten on each
change, so two people checking *different* sub-items of the *same* parent at the
same instant is last-write-wins. Acceptable for a shared checklist. Mitigation
(a Firestore transaction) is deferred — YAGNI for v1.

## Pure helpers — `lib/subItems.ts`

All pure `(SubItem[], …) => SubItem[]` (or scalar), unit-tested in isolation like
`lib/itemName` and `lib/listItemOrdering`:

- `normalizeSubItemName(name): string` — trim + length-limit (reuse the item
  name limit for consistency).
- `sortSubItems(subItems): SubItem[]` — by `order`.
- `addSubItem(subItems, name): SubItem[]` — append with the next order; ignore
  empty names.
- `removeSubItem(subItems, id): SubItem[]`.
- `renameSubItem(subItems, id, name): SubItem[]`.
- `toggleSubItem(subItems, id): SubItem[]`.
- `reorderSubItems(subItems, orderedIds): SubItem[]` — reassign sequential order.
- `subItemProgress(subItems): { done: number; total: number }`.

## Hook — `useListItems`

Extend the allowed `updateItem` updates and the cloud payload to include
`subItems`. Add two methods, each deriving from the **live** `item.subItems`
(kept current by the snapshot) and persisting through the existing `updateItem`
path (cloud `updateDoc` + local `updateLocalItem`):

- `toggleSubItem(itemId, subId)` — used by the list view.
- `setSubItems(itemId, next)` — used by the Edit screen for add/rename/delete/
  reorder.

Sub-item toggles persist and reflect on the snapshot round-trip, matching how the
parent toggle already behaves in the default (non–move-done) mode.

## List view rendering

Sub-items render **inside the parent's cell**, never as separate rows, so
`ReorderableItemList`'s `DraggableFlatList` data stays top-level and the reorder
machinery, done-divider, and counts are unchanged.

- `ListItemRow`, when `item.subItems.length > 0`, shows a **progress badge**
  (`done/total`) and, below the parent, an **always-visible** indented list of
  `SubItemRow`s. There is no collapse/expand — sub-items are shown by default.
- New **`SubItemRow`** component: a smaller checkbox + name, indented under the
  parent's text column, independent toggle, strikethrough when checked (reuse the
  existing completed-text treatment). No drag and no delete in the list view.
- Tapping the parent body still opens the Edit screen; the parent checkbox still
  toggles the parent.

## Edit item screen — "Sub-items" section

The screen has **no Save button** — every field auto-saves — and the sub-items
list is the screen's single scroll container (a `DraggableFlatList` whose
`ListHeaderComponent` holds the Name/Quantity/Description/Link fields and whose
`ListFooterComponent` holds the add-sub-item input and the Delete-item button).
This avoids nesting a `VirtualizedList` inside a `ScrollView`.

- **Main fields (Name/Quantity/Description/Link)** auto-save on blur via
  `updateItem`. Name reverts to the last saved value if blurred empty; Link
  validates on blur and only saves when valid.
- **Each sub-item row** mirrors the list-view interaction:
  - the **checkbox** toggles complete/incomplete;
  - **tapping the label** opens it for inline editing (an autofocused input);
    while editing, a **trash icon** is shown to delete that sub-item, and the
    rename commits on blur via `renameSubItem`;
  - **long-pressing anywhere on the line** starts a drag to reorder (no separate
    drag handle).
- **Adding**: the "Add a sub-item" input adds on the Enter/return key (no "+"
  button) and keeps focus so several can be added in a row, matching the list's
  add flow.
- All sub-item mutations persist **immediately** through `setSubItems` /
  `toggleSubItem`, always derived from the live `item.subItems`, so they cannot
  clobber a concurrent check from the list view. Sub-items are driven directly
  from `item.subItems` (live); local component state holds only the add-input
  text and which sub-item id is being edited.

## Explicitly out of scope

- Sub-items do **not** count toward the home-screen list totals — parents only.
  A partly-done parent still counts as one unchecked item.
- Sub-items do **not** appear in item suggestions or name history.
- Sub-items have **no** detail page.
- Deleting a parent removes its sub-items with it (same document — no orphans).

## Testing

- `lib/subItems.test.ts` — all helpers, covering ordering and name-normalization
  edges (empty, whitespace, over-limit, unknown id).
- Extend the `docToListItem` mapping test — missing / malformed `subItems`
  yields `[]`.
- Hook-level assertions that `setSubItems` and `toggleSubItem` write the expected
  `subItems` payload on both the cloud and local paths.
