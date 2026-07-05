import type { Plan } from '@/lib/plan';

/** Lists a free user (signed-out local OR signed-in free plan) may own/join. */
export const FREE_LIST_LIMIT = 2;

/** True once a local-only user has as many lists as the free tier allows. */
export function isAtFreeListLimit(listCount: number): boolean {
  return listCount >= FREE_LIST_LIMIT;
}

/** Signed-in create gate: free accounts are held at the cap; premium is not. */
export function canCreateList(plan: Plan, listCount: number): boolean {
  return plan === 'premium' || !isAtFreeListLimit(listCount);
}

/** Joining a shared list counts toward the same cap as creating one. */
export function canJoinList(plan: Plan, listCount: number): boolean {
  return plan === 'premium' || !isAtFreeListLimit(listCount);
}

/**
 * Which lists stay editable. 'all' when the cap doesn't bite. Over the cap
 * (post-downgrade) only the user's picked lists — filtered to ones that still
 * exist — are editable; the rest are read-only until a slot frees up.
 */
export function resolveEditableListIds(
  plan: Plan,
  listIds: string[],
  activeListIds: string[] | undefined,
): string[] | 'all' {
  if (plan === 'premium' || listIds.length <= FREE_LIST_LIMIT) {
    return 'all';
  }

  return (activeListIds ?? [])
    .filter((id) => listIds.includes(id))
    .slice(0, FREE_LIST_LIMIT);
}

/** True when over the cap without a complete, valid pick — show the chooser. */
export function needsEditableListPick(
  plan: Plan,
  listIds: string[],
  activeListIds: string[] | undefined,
): boolean {
  const editable = resolveEditableListIds(plan, listIds, activeListIds);
  return editable !== 'all' && editable.length < FREE_LIST_LIMIT;
}

export function isListEditable(
  listId: string,
  editableListIds: string[] | 'all',
): boolean {
  return editableListIds === 'all' || editableListIds.includes(listId);
}
