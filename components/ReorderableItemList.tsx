import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { palette, space } from '@/lib/design';
import { DROP_ANIMATION_CONFIG } from '@/lib/dragAnimation';
import { playToggleHaptic } from '@/lib/haptics';
import type { ListItem } from '@/lib/types';

const DIVIDER_KEY = 'reorderable-done-divider';

// Each row carries everything its cell renders (including whether a
// separator follows it, and the divider's count), so renderItem needn't
// depend on the whole row array. With a stable renderItem and unchanged row
// objects, the list's memoized cells skip re-rendering.
type ItemRow = { kind: 'item'; key: string; item: ListItem; showSeparator: boolean };
type DividerRow = { kind: 'divider'; key: typeof DIVIDER_KEY; doneCount: number };
type Row = ItemRow | DividerRow;

function withSeparators(rows: Row[]): Row[] {
  return rows.map((row, index) => {
    if (row.kind !== 'item') {
      return row;
    }
    const showSeparator = rows[index + 1]?.kind === 'item';
    return row.showSeparator === showSeparator ? row : { ...row, showSeparator };
  });
}

function buildRows(items: ListItem[], moveDoneToBottom: boolean): Row[] {
  const toRow = (item: ListItem): Row => ({
    kind: 'item',
    key: item.id,
    item,
    showSeparator: false,
  });

  if (!moveDoneToBottom || items.length === 0) {
    return withSeparators(items.map(toRow));
  }

  const todos = items.filter((item) => !item.checked).map(toRow);
  const dones = items.filter((item) => item.checked).map(toRow);

  return withSeparators([
    ...todos,
    { kind: 'divider', key: DIVIDER_KEY, doneCount: dones.length },
    ...dones,
  ]);
}

/** Updates the separators and Done count after rows move (e.g. on a drop). */
function withDerivedFields(rows: Row[]): Row[] {
  const dividerIndex = rows.findIndex((row) => row.kind === 'divider');
  const doneCount = dividerIndex < 0 ? 0 : rows.length - dividerIndex - 1;
  return withSeparators(rows).map((row) =>
    row.kind === 'divider' && row.doneCount !== doneCount ? { ...row, doneCount } : row,
  );
}

/** Reuses the previous row object wherever a row's content is unchanged. */
function reuseRows(next: Row[], previous: Map<string, Row>): Row[] {
  return next.map((row) => {
    const prev = previous.get(row.key);
    if (!prev || prev.kind !== row.kind) {
      return row;
    }
    if (row.kind === 'item' && prev.kind === 'item') {
      return prev.item === row.item && prev.showSeparator === row.showSeparator ? prev : row;
    }
    if (row.kind === 'divider' && prev.kind === 'divider') {
      return prev.doneCount === row.doneCount ? prev : row;
    }
    return row;
  });
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
  // Rows are derived during render rather than copied into state by an
  // effect, which cost a second full-list render on every change. A drag's
  // optimistic result is kept until `items` changes (e.g. its write's
  // snapshot arrives).
  const previousRowsRef = useRef(new Map<string, Row>());
  const builtRows = useMemo(() => {
    const next = reuseRows(buildRows(items, moveDoneToBottom), previousRowsRef.current);
    previousRowsRef.current = new Map(next.map((row) => [row.key, row]));
    return next;
  }, [items, moveDoneToBottom]);
  const [dragRows, setDragRows] = useState<{ from: Row[]; rows: Row[] } | null>(null);
  const rows = dragRows && dragRows.from === builtRows ? dragRows.rows : builtRows;
  const setRows = useCallback(
    (next: Row[]) => setDragRows({ from: builtRows, rows: withDerivedFields(next) }),
    [builtRows],
  );

  const dividerIndex = rows.findIndex((row) => row.kind === 'divider');
  const todoCount = dividerIndex < 0 ? rows.length : dividerIndex;

  const handleDragEnd = useCallback(
    ({ data }: DragEndParams<Row>) => {
      const revert = () => setDragRows(null);

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
    [moveDoneToBottom, onReorder, onReorderWithChecked, setRows],
  );

  const renderItem = useCallback(
    ({ item: row, drag, isActive }: RenderItemParams<Row>) => {
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
                { backgroundColor: palette.teal[100], borderRadius: radii.checkbox },
              ]}
            >
              <Text style={[typography.caption, styles.sectionCount, { color: palette.sand[900] }]}>
                {row.doneCount}
              </Text>
            </View>
          </View>
        );
      }

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
          {row.showSeparator ? (
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
      elevation.e2,
      isItemDraggable,
      onPressItem,
      onToggleItem,
      onToggleSubItem,
      radii.checkbox,
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
            { backgroundColor: palette.teal[100], borderRadius: radii.checkbox },
          ]}
        >
          <Text style={[typography.caption, styles.sectionCount, { color: palette.sand[900] }]}>
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
    gap: space[2],
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
    paddingHorizontal: space[2],
  },
  sectionCount: {
    textAlign: 'center',
  },
});
