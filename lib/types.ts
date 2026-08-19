export type NewItemFields = {
  quantity?: string | null;
  description?: string | null;
  link?: string | null;
};

export interface AppList {
  id: string;
  name: string;
  emoji: string;
  ownerId: string;
  memberIds: string[];
  moveDoneToBottom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListItem {
  id: string;
  name: string;
  quantity: string | null;
  description: string | null;
  link: string | null;
  checked: boolean;
  order: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  themePreference: 'system' | 'light' | 'dark';
  /** Display-only mirror of the store entitlement (see PlanContext). */
  premium?: boolean;
  /** Over-cap pick: which lists stay editable on the free plan. */
  activeListIds?: string[];
  /** How the home screen orders lists. */
  listSortMode?: 'alphabetical' | 'recent' | 'custom';
  /** List ids in the user's hand-dragged order, used by the custom mode. */
  listCustomOrder?: string[];
}
