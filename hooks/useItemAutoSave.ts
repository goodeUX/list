import { useCallback, useEffect, useRef } from 'react';

import {
  savableFieldValue,
  storedFieldValue,
  withPendingSubItemRenames,
  type ItemTextField,
  type StoredFieldValue,
} from '@/lib/itemDraft';
import { subItemsEqual } from '@/lib/subItems';
import type { ListItem, SubItem } from '@/lib/types';

export const ITEM_AUTO_SAVE_DELAY_MS = 500;

type ItemUpdates = Partial<Pick<ListItem, ItemTextField | 'subItems'>>;

type Options = {
  item: ListItem | undefined;
  updateItem: (id: string, updates: ItemUpdates) => Promise<void>;
  onError: () => void;
};

/**
 * Saves item edits as the user types: changes are batched and written once
 * typing pauses for ITEM_AUTO_SAVE_DELAY_MS, and any pending write goes out
 * immediately on flush() (field blur) and when the screen unmounts, so
 * leaving the screen never drops an edit.
 */
export function useItemAutoSave({ item, updateItem, onError }: Options) {
  const itemRef = useRef(item);
  const updateItemRef = useRef(updateItem);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    itemRef.current = item;
    updateItemRef.current = updateItem;
    onErrorRef.current = onError;
  });

  const pendingFieldsRef = useRef(new Map<ItemTextField, StoredFieldValue>());
  const pendingRenamesRef = useRef(new Map<string, string>());
  // Renames already written but not yet reflected in `item`, so a structural
  // change made in the meantime doesn't rewrite the old names.
  const sentRenamesRef = useRef(new Map<string, string>());
  const subItems = item?.subItems;
  useEffect(() => {
    sentRenamesRef.current.clear();
  }, [subItems]);
  // Fields whose write has been sent but not yet acknowledged.
  const inFlightRef = useRef(new Map<ItemTextField, number>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const flush = useCallback(() => {
    clearTimer();
    const current = itemRef.current;
    const pendingFields = pendingFieldsRef.current;
    const pendingRenames = pendingRenamesRef.current;
    if (!current) {
      pendingFields.clear();
      pendingRenames.clear();
      return;
    }

    const updates: ItemUpdates = {};
    const fields: ItemTextField[] = [];
    pendingFields.forEach((value, field) => {
      if (value !== storedFieldValue(current, field)) {
        // name is only queued when non-empty (see savableFieldValue).
        Object.assign(updates, { [field]: value });
        fields.push(field);
      }
    });
    if (pendingRenames.size > 0) {
      const next = withPendingSubItemRenames(current.subItems, pendingRenames);
      if (!subItemsEqual(next, current.subItems)) {
        updates.subItems = next;
        pendingRenames.forEach((name, id) => sentRenamesRef.current.set(id, name));
      }
    }
    pendingFields.clear();
    pendingRenames.clear();

    if (Object.keys(updates).length === 0) {
      return;
    }

    const inFlight = inFlightRef.current;
    fields.forEach((field) => inFlight.set(field, (inFlight.get(field) ?? 0) + 1));
    void updateItemRef
      .current(current.id, updates)
      .catch(() => onErrorRef.current())
      .finally(() => {
        fields.forEach((field) => {
          const count = (inFlight.get(field) ?? 1) - 1;
          if (count > 0) {
            inFlight.set(field, count);
          } else {
            inFlight.delete(field);
          }
        });
      });
  }, []);

  const schedule = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(flush, ITEM_AUTO_SAVE_DELAY_MS);
  }, [flush]);

  const queueField = useCallback(
    (field: ItemTextField, draft: string) => {
      const value = savableFieldValue(field, draft);
      if (value === undefined) {
        // Not savable yet (empty name, incomplete link): keep the stored value.
        pendingFieldsRef.current.delete(field);
      } else {
        pendingFieldsRef.current.set(field, value);
      }
      schedule();
    },
    [schedule],
  );

  const queueSubItemRename = useCallback(
    (subId: string, name: string) => {
      pendingRenamesRef.current.set(subId, name);
      schedule();
    },
    [schedule],
  );

  /** True while a field has an unsaved or unacknowledged edit. */
  const isFieldDirty = useCallback(
    (field: ItemTextField) =>
      pendingFieldsRef.current.has(field) || inFlightRef.current.has(field),
    [],
  );

  /**
   * Sub-items with pending renames applied, for a structural change (add,
   * remove, toggle, reorder) that rewrites the whole array. Call
   * commitSubItemRenames() when that write is sent, since it carries them.
   */
  const withSubItemRenames = useCallback(
    (base: SubItem[]) =>
      withPendingSubItemRenames(
        withPendingSubItemRenames(base, sentRenamesRef.current),
        pendingRenamesRef.current,
      ),
    [],
  );

  const commitSubItemRenames = useCallback(() => {
    pendingRenamesRef.current.clear();
  }, []);

  /** Drops pending edits without saving, e.g. before deleting the item. */
  const discard = useCallback(() => {
    clearTimer();
    pendingFieldsRef.current.clear();
    pendingRenamesRef.current.clear();
    sentRenamesRef.current.clear();
  }, []);

  useEffect(() => () => flush(), [flush]);

  return {
    commitSubItemRenames,
    discard,
    flush,
    isFieldDirty,
    queueField,
    queueSubItemRename,
    withSubItemRenames,
  };
}
