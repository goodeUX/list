export interface AppList {
  id: string;
  name: string;
  emoji: string;
  ownerId: string;
  memberIds: string[];
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

export interface ItemHistoryEntry {
  id: string;
  name: string;
  quantity: string | null;
  lastUsedAt: Date;
  useCount: number;
  lastListId: string;
}

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  themePreference: 'system' | 'light' | 'dark';
}
