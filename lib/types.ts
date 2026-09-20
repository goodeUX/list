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

export interface SubItem {
  id: string;
  name: string;
  checked: boolean;
  order: number;
}

export interface ListItem {
  id: string;
  name: string;
  quantity: string | null;
  description: string | null;
  link: string | null;
  checked: boolean;
  order: number;
  subItems: SubItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

