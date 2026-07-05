/** Lists a signed-out (local-only) user may keep before they must sign in. */
export const FREE_LIST_LIMIT = 2;

/** True once a local-only user has as many lists as the free tier allows. */
export function isAtFreeListLimit(listCount: number): boolean {
  return listCount >= FREE_LIST_LIMIT;
}
