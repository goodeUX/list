# Drag-to-reorder list items — Design

Date: 2026-06-26

## Goal

Let users manually reorder items within a list by dragging and dropping.

- **Native (iOS/Android):** long-press a row to pick it up, then drag.
- **Web:** a grab handle (`≡`) on the row's right edge, fading in on hover; click-drag to reorder.

## Existing infrastructure (reused, not rebuilt)

- `react-native-draggable-flatlist@4.0.3` is installed and is Reanimated-v4 compatible
  (uses only current APIs: `useSharedValue`, `useDerivedValue`, `useAnimatedReaction`,
  `runOnJS`/`runOnUI`, `withSpring`, modern `Gesture.Pan()`/`GestureDetector`).
- `GestureHandlerRootView` already wraps the app at `app/_layout.tsx`.
- `useListItems` already exposes `reorderItems(orderedItems)`, which persists new sequential
  `order` to both Firestore and the local store via `withSequentialOrder`.
- `useListItems` has a private `applyItemLayout(orderedItems)` that persists both `order` **and**
  `checked` (used by toggle + group-done). It will be exposed for the done-mode drag.

## Component: `ReorderableItemList`

Replaces the inline `FlatList` / `SectionList` in `app/list/[id]/index.tsx`. One component,
two modes driven by `moveDoneToBottom`.

### Drag trigger (both modes)

- Built on `DraggableFlatList`. `renderItem` receives `drag` + `isActive`.
- **Native:** the existing `ListItemRow` gets an `onLongPress` that calls `drag` (+ a haptic).
- **Web:** a hover-revealed grab handle on the row's right edge; `onPressIn` calls `drag`.
  Handle is web-only so native rows stay clean. Implemented as an optional `dragHandle` slot
  passed into `ListItemRow`.
- Tap-to-open and checkbox-toggle are unaffected (long-press / handle are distinct gestures).
- Drag is disabled while the add-input is focused on native (`lockListItems`), and for
  optimistic (not-yet-persisted) items.

### Mode 1 — default (flat)

- `DraggableFlatList` over all items in their stored order.
- `onDragEnd({ data })` → optimistically set local order → `reorderItems(data)` (order only).

### Mode 2 — "Move done to bottom" (cross-section toggle)

- Still a single `DraggableFlatList`. Data = `[...todos, DONE_DIVIDER, ...dones]`.
  - "To do" header → `ListHeaderComponent` (always top, never draggable).
  - `DONE_DIVIDER` → a sentinel row rendered as the "Done" section header; it is in `data`
    but never calls `drag`, so the user cannot pick it up (other rows reorder around it).
- On `onDragEnd({ data })`: find the divider's index. Items **above** → `checked: false`,
  items **below** → `checked: true`. So dragging a to-do below the divider ticks it
  (checkbox + strikethrough); dragging a done item above unticks it.
- Persist via the now-exposed `applyItemLayout` (writes `checked` + `order`). The store then
  re-groups todos-above / dones-below, matching the divider's resting position.
- Section header counts update live from how many items sit each side of the divider.

### Optimistic ordering

- The component holds a local copy of the item list for instant reordering, reconciled when
  the hook's `items` change (server snapshot echoes the persisted order, so it settles).

## Risk: web

`react-native-draggable-flatlist` is solid on native but historically quirky on web. Plan:
wire web up with the handle and **verify live in the running web preview**. If the library
misbehaves on web, fall back to a web-only pointer-based reorder (handle-driven), keeping
native on the library. Flag rather than ship something janky.

## Out of scope

- Reordering across different lists.
- Persisted manual order interacting with any future sort-by feature (separate TODO).
