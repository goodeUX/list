import { doc, onSnapshot } from 'firebase/firestore';

import { db } from '@/lib/firebase';

/**
 * Owner-managed complimentary premium. A doc at premiumGrants/{email}
 * (lowercased email as the id, created in the Firebase console) grants
 * premium to whichever account signs in with that email. Existence of the
 * doc IS the grant; fields are informational only.
 */

export function normalizePremiumGrantEmail(
  email: string | null | undefined,
): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

/**
 * Live-subscribes to the signed-in user's own grant. Grants and revocations
 * apply without a reinstall. Errors (e.g. rules not yet deployed) resolve to
 * "no grant" rather than throwing.
 */
export function subscribeToPremiumGrant(
  email: string | null | undefined,
  onChange: (active: boolean) => void,
): () => void {
  const normalized = normalizePremiumGrantEmail(email);
  if (!normalized) {
    onChange(false);
    return () => {};
  }

  return onSnapshot(
    doc(db, 'premiumGrants', normalized),
    (snapshot) => onChange(snapshot.exists()),
    () => onChange(false),
  );
}
