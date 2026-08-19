# Add-item autocomplete from list history

**Date:** 2026-08-19
**Status:** Approved design, ready for planning

## Problem

Adding an item means typing its full name every time, even for names the list
has held before. After the first typed letter the app should offer matching
names from that same list so the user can tap instead of type.

## Scope

- Autocomplete on the add-item input of the list detail screen only.
- Suggestions come from names previously added to **that list**, shared across
  everyone who has access to the list.
- Removal of the dead per-user `itemHistory` machinery it replaces.

Out of scope: suggestions from other lists, suggestions on the item detail
screen, recording renames as history, any fuzzy/typo-tolerant matching.

## Behaviour

### Trigger and dismissal

The suggestion panel is shown when all of these hold:

- the add-item input is focused,
- the trimmed input is at least 1 character,
- at least one history entry matches.

It is hidden when the input is cleared, when nothing matches, on blur, and
immediately after a suggestion is tapped. Read-only (free-plan) lists render no
add input at all, so the panel never appears there.

### Matching

Both the query and the candidate name are normalised: trimmed, lowercased, and
diacritics stripped (`NFD` plus combining-mark removal).

A candidate matches when the normalised query is a prefix of the whole
normalised name, or a prefix of any word within it. Words are split on
whitespace and hyphens.

- `cho` matches `chocolate` (whole-name prefix).
- `cho` matches `hot chocolate` (word prefix).
- `cho` does **not** match `nacho chips` (mid-word).

### Ranking

Sorted by, in order:

1. whole-name prefix matches before word-prefix matches,
2. `useCount` descending,
3. `lastUsedAt` descending,
4. name ascending (case-insensitive), as a stable final tiebreak.

The panel height is the number of rows it actually has, capped at 5 — one match
renders a one-row panel. At most 20 ranked matches are rendered; past the fifth
they are reachable by scrolling inside the 5-row height.

A candidate whose name exactly equals the typed text is still shown; tapping it
is faster than reaching for the submit button.

### Items already on the list

For each candidate, look for an item currently on the list with the same
normalised name:

| State | Panel | Tap behaviour |
| --- | --- | --- |
| Not on the list | shown | adds the item |
| On the list, unchecked | **hidden** | — |
| On the list, checked | shown, with a muted check icon on the row | **unchecks the existing item**; no new item is created |

The muted check icon exists so the differing tap behaviour of the row is visible
before the tap. Unchecking runs the existing `toggleItem`, so `moveDoneToBottom`
reordering applies unchanged.

### Tapping a suggestion

Both tap behaviours share the same shell: clear the input, keep focus on the
input for the next entry, hide the panel, and record the name in the history of
the list (bumping `useCount` and `lastUsedAt`). Adding plays
`playAddItemHaptic()`; unchecking plays `playToggleHaptic()`, matching what each
action already does elsewhere.

Adding reuses the existing add path so the optimistic insert, the top-of-list
placement, and the failure alert all behave exactly as pressing the submit
button does.

### Presentation

- Absolutely positioned directly under the add-input row, overlaying the top of
  the item list. The list is already frozen while the input is focused
  (`lockListItems`), so nothing behind the panel is interactive.
- Same horizontal margins as the add-input row (`spacing.lg`) so its edges line
  up with the input.
- `colors.surface` background, `colors.border` hairline, `radii.card` corners,
  and the same elevation/shadow values as `ListOptionsMenu` (elevation 8,
  `shadowOpacity` 0.14, `shadowRadius` 10, offset `{0, 4}`).
- One row per suggestion, single-line with tail ellipsis. The matched segment is
  rendered semibold in `colors.text`; the rest in `colors.textSecondary`.
- Each row is a button with an accessibility label of `Add <name>` or
  `Uncheck <name>`.

## Data model

### Cloud lists

New subcollection `lists/{listId}/itemHistory/{slug}`, where `slug` is the
existing `historyDocId(name)`:

```
{ name: string, useCount: number, lastUsedAt: Timestamp }
```

Rules gain, inside `match /lists/{listId}`:

```
match /itemHistory/{historyId} {
  allow read, write: if isListMember(listId);
}
```

History belongs to the list, so every collaborator reads and writes the same
entries.

### Local lists

Signed-out users and local lists use an AsyncStorage mirror in
`lib/localListHistory.ts`, keyed `list_app_list_item_history_v1:{listId}`,
holding the same fields. The existing `usesCloudListData(user, listId)` chooses
between the two, matching how `listMutations.ts` already branches.

### Seeding

The first time the history of a list is read and comes back empty, seed it from
the items currently on the list (`useCount: 1`, `lastUsedAt: now`), so existing
lists produce useful suggestions immediately. Seeding waits until items have
finished loading. It is naturally idempotent — after seeding the history is no
longer empty — and because doc ids are name slugs, two collaborators seeding
concurrently upsert the same docs rather than duplicating them.

### Reads

New `hooks/useListItemHistory.ts`:

- fetches once per list open (`getDocs` / AsyncStorage read), not a live
  listener — suggestions do not need real-time updates and a listener would add
  a standing read cost per open list,
- holds entries in state,
- exposes `recordName(name)` which updates state optimistically and then writes
  through,
- performs the seed described above.

### Lifecycle

- Deleting a list deletes its history: extend `deleteListById` to delete the
  `itemHistory` subcollection alongside `items`, and `deleteLocalList` to drop
  the matching AsyncStorage key.
- **Clearing** a list does not touch its history — that history is precisely
  what makes the feature useful afterwards.
- Entries are capped at 500 per list. After a write that exceeds the cap, prune
  the excess (lowest `useCount` first, then oldest `lastUsedAt`) in the
  background.
- `migrateLocalDataToCloud` copies the history of each local list into the
  `itemHistory` subcollection of the new cloud list, keyed to the freshly
  created `listRef.id`, and clears the local key afterwards. Without this,
  signing in would silently lose every suggestion.

## Removing the dead per-user history

`users/{uid}/itemHistory` is written on every add through
`hooks/useItemHistory.ts`, but nothing has ever read it: the only call site,
`app/list/[id]/index.tsx`, destructures `recordItemUsage` and ignores `entries`.
Keeping it would mean a redundant Firestore write on every add.

Delete: `hooks/useItemHistory.ts`, `lib/localHistory.ts`, the
`ItemHistoryEntry` type, the history loop in `migrateLocalDataToCloud`, and the
`match /itemHistory/{historyId}` block under `match /users/{uid}`.

Keep `lib/historyDocId.ts` — the new per-list store reuses it for doc ids.

Existing `users/{uid}/itemHistory` documents in Firestore are left in place;
they become unreachable once the rules block is removed, and no cleanup
migration is worth writing for data nothing reads.

## Structure

New files:

- `lib/itemSuggestions.ts` — pure normalisation, matching, ranking, and the
  already-on-the-list filter. No React, no storage.
- `lib/localListHistory.ts` — AsyncStorage mirror.
- `hooks/useListItemHistory.ts` — fetch, seed, record, prune.
- `components/AddItemSuggestions.tsx` — the panel.

`app/list/[id]/index.tsx` (already 1080 lines) gains only the hook call, a tap
handler, and the panel element. All matching logic stays in `lib/`.

## Testing

Unit tests in `lib/__tests__/`:

- `itemSuggestions.test.ts` — whole-name vs word-prefix matching, the mid-word
  non-match, diacritic and case insensitivity, ranking order including each
  tiebreak, the 5-item cap, unchecked items hidden, checked items retained and
  flagged.
- `localListHistory.test.ts` — record, increment, per-list key isolation, the
  500-entry prune order, and deletion.

Verification is `npx tsc --noEmit` plus `npm test`. Visual verification of the
panel is done by hand on a dev build.
