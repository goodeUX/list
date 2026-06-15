import type { User } from 'firebase/auth';

export function isLocalListId(listId: string | undefined): listId is string {
  return typeof listId === 'string' && listId.startsWith('local_');
}

export function usesCloudListData(
  user: User | null | undefined,
  listId: string | undefined,
): user is User {
  return Boolean(user && listId && !isLocalListId(listId));
}
