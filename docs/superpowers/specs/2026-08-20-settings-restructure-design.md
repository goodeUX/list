# Settings restructure: Profile and Security sub-pages

**Date:** 2026-08-20
**Status:** Approved design, ready for implementation

## Problem

Settings holds everything at one level: appearance, the biometric lock, the
account row, the plan, and sign out, while the account editor mixes the display
name, the email and the password change into a single form. Credentials and
identity should be separated, and the account should be reachable from an
avatar in the header rather than a card in the list.

## Scope

- Add a user avatar to the Settings header, opening Profile.
- Rename the account editor to Profile and reduce it to identity: avatar,
  display name, email, sign out.
- Add a Security sub-page holding the biometric toggle and the password change.

Out of scope: uploading or changing an avatar image, and any Firebase Storage
work.

## Pages

### Settings (`app/settings/index.tsx`)

Header: back chevron, "Settings", and the user avatar at the trailing edge.
Tapping the avatar opens Profile.

Cards, in order: Appearance (unchanged), Security (a single row with a chevron,
opening the Security page), Plan (unchanged). The cat illustration stays.

Removed: the Account card and the Sign out button at the bottom, both of which
move to Profile.

### Profile (`app/settings/profile.tsx`, renamed from `edit-account.tsx`)

Header: back chevron, "Profile". Body: a large avatar, the display name as an
editable field, the email as read-only text, and a Sign out button.

Removed from this page: the email input, the current-password field and the
whole change-password block.

### Security (`app/settings/security.tsx`, new)

Header: back chevron, "Security". Body: the Fingerprint / Face ID toggle,
then Change password with current, new and confirm fields and a "Save changes"
bottom bar.

## Behaviour

### Avatar

A new `components/UserAvatar.tsx` takes a size and renders `user.photoURL`
when the provider supplies one — Google sign-in does — falling back to the
existing circle with the account's first initial. Used at the current 32px in
the Settings header and at a larger size on Profile.

No pencil, no picker, no upload. Nothing writes `photoURL`.

### Signed out

Settings keeps today's Account card with its Sign in / Sign up buttons, shows
no avatar in the header, and hides the Security row. Profile and Security are
only reachable while signed in.

### When the Security row appears

Signed in, **and** either the biometric capability is not `unsupported` **or**
the account has a password provider. Without the second clause a Google-only
user on a device without biometrics would open an empty page.

On the page itself:

- the biometric block keeps the existing `ready` / unavailable handling from
  the current Settings section,
- the change-password block renders only for accounts with a password
  provider, since Google-only accounts have no password to change.

### Saving the display name

The name saves itself; there is no Save button on Profile.

- Saves on blur, when the trimmed name is non-empty and differs from the one
  currently stored.
- Also saves on leaving the screen, since a hardware back press can unmount
  before blur fires.
- An empty or whitespace-only name is not saved; the field reverts to the
  stored name on blur, because a display name is required.
- While the write is in flight the field shows a small activity indicator; a
  failure shows an inline error and keeps the edited text so it is not lost.

### Email

Read-only text. `updateAccount` is called with the account's existing email,
so its email-change path goes unused, and the "enter your current password to
change your email" logic disappears with the input.

This removes email changing from the app: it exists nowhere else. Deliberate.

### Sign out

Lives only on Profile now, one tap further than today.

## Structure

- `app/settings/security.tsx` — new. Lifts the change-password block out of
  `edit-account.tsx` and the app-lock block out of `settings/index.tsx`.
- `app/settings/profile.tsx` — `edit-account.tsx` renamed via `git mv` and
  stripped to identity plus sign out.
- `app/settings/index.tsx` — loses the Account card, the app-lock section and
  the bottom Sign out button; gains the header avatar and the Security row.
- `components/UserAvatar.tsx` — new.

Both source files shrink. No new dependencies.

`experiments.typedRoutes` is enabled, so renaming the file updates the route
union and any stale `'/settings/edit-account'` push becomes a type error
rather than a runtime one.

## Testing

The repo unit-tests `lib/` only, and this work adds no logic there, so it adds
no unit tests. Verification is `npx tsc --noEmit` plus `npx jest`, with the
visual and device check done by hand.

Worth checking by hand: the auto-save on blur and on back, the Google versus
email account difference on the Security page, and the signed-out Settings
page.
