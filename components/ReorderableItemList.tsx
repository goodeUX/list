import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import DraggableFlatList, {
  type DragEndParams,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';

import ListItemRow from '@/components/ListItemRow';
import { useTheme } from '@/contexts/ThemeContext';
import { DROP_ANIMATION_CONFIG } from '@/lib/dragAnimation';
import { playToggleHaptic } from '@/lib/haptics';
import type { ListItem } from '@/lib/types';

const DIVIDER_KEY = 'reorderable-done-divider';

type ItemRow = { kind: 'item'; key: string; item: ListItem };
type DividerRow = { kind: 'divider'; key: typeof DIVIDER_KEY };
type Row = ItemRow | DividerRow;

function buildRows(items: ListItem[], moveDoneToBottom: boolean): Row[] {
  if (!moveDoneToBottom || items.length === 0) {
    return items.map((item) => ({ kind: 'item', key: item.id, item }));
  }

  const todos: Row[] = items
    .filter((item) => !item.checked)
    .map((item) => ({ kind: 'item', key: item.id, item }));
  const dones: Row[] = items
    .filter((item) => item.checked)
    .map((item) => ({ kind: 'item', key: item.id, item }));

  return [...todos, { kind: 'divider', key: DIVIDER_KEY }, ...dones];
}

type ReorderableItemListProps = {
  items: ListItem[];
  moveDoneToBottom: boolean;
  disabled: boolean;
  isItemDraggable: (item: ListItem) => boolean;
  onReorder: (items: ListItem[]) => void | Promise<void>;
  onReorderWithChecked: (items: ListItem[]) => void | Promise<void>;
  onPressItem: (item: ListItem) => void;
  onToggleItem: (id: string) => void;
  onToggleSubItem: (itemId: string, subId: string) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  ListEmptyComponent?: React.ReactElement | null;
};

export default function ReorderableItemList({
  items,
  moveDoneToBottom,
  disabled,
  isItemDraggable,
  onReorder,
  onReorderWithChecked,
  onPressItem,
  onToggleItem,
  onToggleSubItem,
  contentContainerStyle,
  ListEmptyComponent,
}: ReorderableItemListProps) {
  const { colors, radii, spacing, typography, elevation } = useTheme();
  const [rows, setRows] = useState<Row[]>(() => buildRows(items, moveDoneToBottom));

  useEffect(() => {
    setRows(buildRows(items, moveDoneToBottom));
  }, [items, moveDoneToBottom]);

  const dividerIndex = rows.findIndex((row) => row.kind === 'divider');
  const todoCount = dividerIndex < 0 ? rows.length : dividerIndex;
  const doneCount = dividerIndex < 0 ? 0 : rows.length - dividerIndex - 1;

  const handleDragEnd = useCallback(
    ({ data }: DragEndParams<Row>) => {
      const revert = () => setRows(buildRows(items, moveDoneToBottom));

      // Defer the persist to a later task so React can commit + paint the
      // optimistic reorder FIRST. Running the Firestore write in the same tick
      // (it is invoked via Reanimated runOnJS) blocks the optimistic re-render
      // from flushing until the network round-trip resolves.
      const deferPersist = (run: () => Promise<unknown>) => {
        setTimeout(() => {
          run().catch(revert);
        }, 0);
      };

      if (!moveDoneToBottom) {
        setRows(data);
        const nextItems = data
          .filter((row): row is ItemRow => row.kind === 'item')
          .map((row) => row.item);
        deferPersist(() => Promise.resolve(onReorder(nextItems)));
        return;
      }

      // Reuse the library's own row array/objects so only the items that
      // actually changed checked state get new references — minimising cell
      // re-renders right as the drop settles (extra renders here corrupt the
      // list's cell layout). The divider's position already encodes the
      // todo/done split, so no regrouping is needed.
      const nextDividerIndex = data.findIndex((row) => row.kind === 'divider');
      const nextRows: Row[] = data.map((row, index) => {
        if (row.kind !== 'item') {
          return row;
        }
        const checked = index > nextDividerIndex;
        return checked === row.item.checked ? row : { ...row, item: { ...row.item, checked } };
      });
      const nextItems = nextRows
        .filter((row): row is ItemRow => row.kind === 'item')
        .map((row) => row.item);

      setRows(nextRows);
      deferPersist(() => Promise.resolve(onReorderWithChecked(nextItems)));
    },
    [items, moveDoneToBottom, onReorder, onReorderWithChecked],
  );

  const renderItem = useCallback(
    ({ item: row, drag, isActive, getIndex }: RenderItemParams<Row>) => {
      if (row.kind === 'divider') {
        return (
          <View
            style={[
              styles.sectionHeaderRow,
              { marginTop: spacing.md, marginBottom: spacing.sm },
            ]}
          >
            <Text style={[typography.label, styles.sectionHeader, { color: colors.textSecondary }]}>Done</Text>
            <View
              style={[
                styles.sectionCountBadge,
                { backgroundColor: colors.accent, borderRadius: radii.checkbox },
              ]}
            >
              <Text style={[typography.caption, styles.sectionCount, { color: colors.text }]}>
                {doneCount}
              </Text>
            </View>
          </View>
        );
      }

      const index = getIndex() ?? 0;
      const nextRow = rows[index + 1];
      const showSeparator = nextRow?.kind === 'item';
      const dragEnabled = !disabled && isItemDraggable(row.item);

      const startDrag = () => {
        if (Platform.OS !== 'web') {
          playToggleHaptic();
        }
        drag();
      };

      const dragHandle =
        Platform.OS === 'web' && dragEnabled ? (
          <Pressable
            accessibilityLabel="Drag to reorder"
            accessibilityRole="button"
            onPressIn={drag}
            style={({ pressed }) => [
              styles.handleButton,
              { opacity: pressed ? 0.6 : 1 },
              Platform.OS === 'web' ? ({ cursor: 'grab' } as object) : null,
            ]}
          >
            <MaterialIcons color={colors.textSecondary} name="drag-indicator" size={20} />
          </Pressable>
        ) : undefined;

      return (
        <View
          style={
            isActive
              ? [styles.activeCell, elevation.e2, { backgroundColor: colors.surfaceRaised }]
              : null
          }
        >
          <ListItemRow
            disabled={disabled}
            dragHandle={dragHandle}
            isActive={isActive}
            item={row.item}
            onLongPress={
              Platform.OS !== 'web' && dragEnabled ? startDrag : undefined
            }
            onPress={() => onPressItem(row.item)}
            onToggle={() => onToggleItem(row.item.id)}
            onToggleSubItem={(subId) => onToggleSubItem(row.item.id, subId)}
          />
          {showSeparator ? (
            <View style={[styles.itemSeparator, { backgroundColor: colors.border }]} />
          ) : null}
        </View>
      );
    },
    [
      colors.border,
      colors.surfaceMuted,
      colors.surfaceRaised,
      colors.textSecondary,
      disabled,
      doneCount,
      elevation.e2,
      isItemDraggable,
      onPressItem,
      onToggleItem,
      onToggleSubItem,
      radii.checkbox,
      rows,
      spacing.md,
      spacing.sm,
      typography.caption,
      typography.label,
    ],
  );

  const listHeader = useMemo(() => {
    if (!moveDoneToBottom || items.length === 0) {
      return null;
    }

    return (
      <View style={[styles.sectionHeaderRow, { marginBottom: spacing.sm }]}>
        <Text style={[typography.label, styles.sectionHeader, { color: colors.textSecondary }]}>To do</Text>
        <View
          style={[
            styles.sectionCountBadge,
            { backgroundColor: colors.accent, borderRadius: radii.checkbox },
          ]}
        >
          <Text style={[typography.caption, styles.sectionCount, { color: colors.text }]}>
            {todoCount}
          </Text>
        </View>
      </View>
    );
  }, [
    colors.surfaceMuted,
    colors.textSecondary,
    items.length,
    moveDoneToBottom,
    radii.checkbox,
    spacing.sm,
    todoCount,
    typography.caption,
    typography.label,
  ]);

  return (
    <DraggableFlatList
      animationConfig={DROP_ANIMATION_CONFIG}
      containerStyle={styles.flex}
      contentContainerStyle={contentContainerStyle}
      data={rows}
      dragItemOverflow
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(row) => row.key}
      ListEmptyComponent={items.length === 0 ? ListEmptyComponent : null}
      ListHeaderComponent={listHeader}
      onDragEnd={handleDragEnd}
      removeClippedSubviews={false}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      style={styles.flex}
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  activeCell: {},
  handleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 32,
  },
  itemSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sectionHeader: {
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sectionCountBadge: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 6,
  },
  sectionCount: {
    textAlign: 'center',
  },
});
