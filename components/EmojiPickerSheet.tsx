import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/contexts/ThemeContext';
import {
  activeCategoryIndex,
  buildEmojiLayout,
  buildSearchRows,
  searchEmojis,
  EMOJI_CATEGORIES,
  type CatalogEmoji,
  type EmojiRow,
} from '@/lib/emojiCatalog';

/** How many emoji rows are visible before scrolling. The sheet sizes itself to fit. */
const VISIBLE_ROWS = 6;
const HEADER_HEIGHT = 34;
const MIN_CELL_SIZE = 44;
const TAB_BAR_HEIGHT = 52;
const EMOJI_FONT_SIZE = 26;

// Rendering every emoji at once would stall the open animation, so the list keeps
// a deliberately large window mounted instead. That covers several screens in each
// direction, so normal scrolling never lands on an unrendered row.
const INITIAL_ROWS_RENDERED = 48;
const RENDER_WINDOW = 41;

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  smileys_emotion: 'happy-outline',
  people_body: 'people-outline',
  animals_nature: 'leaf-outline',
  food_drink: 'fast-food-outline',
  travel_places: 'airplane-outline',
  activities: 'basketball-outline',
  objects: 'bulb-outline',
  symbols: 'shapes-outline',
  flags: 'flag-outline',
};

type EmojiPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  selected: string;
};

export default function EmojiPickerSheet({
  visible,
  onClose,
  onSelect,
  selected,
}: EmojiPickerSheetProps) {
  const { colors, radii, spacing } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const listRef = useRef<FlatList<EmojiRow>>(null);
  // Set while a tab tap is scrolling, so the scroll handler doesn't fight it.
  const pendingCategoryRef = useRef<number | null>(null);

  const columns = Math.max(6, Math.floor(windowWidth / MIN_CELL_SIZE));
  const cellSize = windowWidth / columns;
  const listHeight = VISIBLE_ROWS * cellSize;

  const layout = useMemo(
    () => buildEmojiLayout(columns, HEADER_HEIGHT, cellSize),
    [cellSize, columns],
  );

  const searchResults = useMemo(() => searchEmojis(query), [query]);
  const searchRows = useMemo(
    () => (searchResults ? buildSearchRows(searchResults, columns) : null),
    [columns, searchResults],
  );

  const rows = searchRows ?? layout.rows;
  const searching = searchRows !== null;

  const getItemLayout = useCallback(
    (_data: ArrayLike<EmojiRow> | null | undefined, index: number) => {
      if (searching) {
        return { length: cellSize, offset: cellSize * index, index };
      }

      return {
        length: layout.offsets[index + 1] - layout.offsets[index],
        offset: layout.offsets[index],
        index,
      };
    },
    [cellSize, layout, searching],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (searching) {
        return;
      }

      const next = activeCategoryIndex(
        layout.categoryOffsets,
        event.nativeEvent.contentOffset.y,
      );

      // Ignore scroll updates until the tab-driven scroll has arrived, otherwise
      // the highlight flickers across every category it passes on the way.
      if (pendingCategoryRef.current !== null) {
        if (pendingCategoryRef.current !== next) {
          return;
        }
        pendingCategoryRef.current = null;
      }

      setActiveCategory((current) => (current === next ? current : next));
    },
    [layout.categoryOffsets, searching],
  );

  const handleSelectCategory = (index: number) => {
    pendingCategoryRef.current = index;
    setActiveCategory(index);

    const scrollToCategory = () =>
      listRef.current?.scrollToOffset({
        offset: layout.categoryOffsets[index],
        animated: false,
      });

    if (searching) {
      // The list is still showing search results this frame; wait for it to swap
      // back to the full catalog or the offset would apply to the wrong content.
      setQuery('');
      requestAnimationFrame(scrollToCategory);
      return;
    }

    scrollToCategory();
  };

  const handleSelectEmoji = useCallback(
    (emoji: CatalogEmoji) => {
      // Drop the search keyboard first so the sheet slides straight down instead
      // of shifting as the window resizes underneath it.
      Keyboard.dismiss();
      onSelect(emoji.emoji);
      setQuery('');
    },
    [onSelect],
  );

  const handleClose = () => {
    Keyboard.dismiss();
    setQuery('');
    onClose();
  };

  const renderRow = useCallback(
    ({ item }: { item: EmojiRow }) => {
      if (item.type === 'header') {
        return (
          <View style={[styles.sectionHeader, { height: HEADER_HEIGHT }]}>
            <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.emojiRow}>
          {item.items.map((emoji) => (
            <Pressable
              accessibilityLabel={emoji.name}
              accessibilityRole="button"
              key={emoji.name}
              onPress={() => handleSelectEmoji(emoji)}
              style={({ pressed }) => [
                styles.emojiCell,
                {
                  backgroundColor:
                    emoji.emoji === selected ? colors.surfaceMuted : 'transparent',
                  borderRadius: radii.checkbox,
                  height: cellSize,
                  opacity: pressed ? 0.6 : 1,
                  width: cellSize,
                },
              ]}
            >
              <Text style={styles.emojiText}>{emoji.emoji}</Text>
            </Pressable>
          ))}
        </View>
      );
    },
    [
      cellSize,
      colors.surfaceMuted,
      colors.textSecondary,
      handleSelectEmoji,
      radii.checkbox,
      selected,
    ],
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdropRoot}>
        <Pressable onPress={handleClose} style={styles.backdrop} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.card,
              borderTopRightRadius: radii.card,
            },
          ]}
        >
          <View style={[styles.knob, { backgroundColor: colors.border }]} />

          <View
            style={[
              styles.searchRow,
              { borderBottomColor: colors.border, paddingHorizontal: spacing.md },
            ]}
          >
            <View
              style={[
                styles.searchField,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  borderRadius: radii.item,
                },
              ]}
            >
              <Ionicons color={colors.textSecondary} name="search" size={16} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, { color: colors.text }]}
                value={query}
              />
              {query ? (
                <Pressable
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  onPress={() => setQuery('')}
                >
                  <Ionicons color={colors.textSecondary} name="close-circle" size={16} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {searching && rows.length === 0 ? (
            <View style={[styles.emptyState, { height: listHeight }]}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No emoji found
              </Text>
            </View>
          ) : (
            <FlatList
              data={rows}
              getItemLayout={getItemLayout}
              initialNumToRender={INITIAL_ROWS_RENDERED}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.key}
              maxToRenderPerBatch={INITIAL_ROWS_RENDERED}
              onScroll={handleScroll}
              ref={listRef}
              removeClippedSubviews={false}
              renderItem={renderRow}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              style={{ height: listHeight }}
              windowSize={RENDER_WINDOW}
            />
          )}

          <View
            style={[
              styles.tabBar,
              {
                borderTopColor: colors.border,
                height: TAB_BAR_HEIGHT,
              },
            ]}
          >
            {EMOJI_CATEGORIES.map((category, index) => {
              const isActive = !searching && index === activeCategory;

              return (
                <Pressable
                  accessibilityLabel={category.label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  key={category.key}
                  onPress={() => handleSelectCategory(index)}
                  style={styles.tab}
                >
                  <View
                    style={[
                      styles.tabIcon,
                      {
                        backgroundColor: isActive ? colors.surfaceMuted : 'transparent',
                        borderRadius: radii.checkbox,
                      },
                    ]}
                  >
                    <Ionicons
                      color={isActive ? colors.accent : colors.textSecondary}
                      name={CATEGORY_ICONS[category.key] ?? 'ellipse-outline'}
                      size={20}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  // Transparent: the New list modal underneath already dims the screen. This only
  // exists so tapping outside the sheet still closes it.
  backdrop: StyleSheet.absoluteFillObject,
  sheet: {
    overflow: 'hidden',
    width: '100%',
  },
  knob: {
    alignSelf: 'center',
    borderRadius: 3,
    height: 5,
    marginTop: 8,
    width: 44,
  },
  searchRow: {
    // Matches the tab bar's top border so both dividers read the same weight.
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
    paddingTop: 12,
  },
  searchField: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    padding: 0,
  },
  sectionHeader: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  sectionHeaderText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
  },
  emojiRow: {
    flexDirection: 'row',
  },
  emojiCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: EMOJI_FONT_SIZE,
    lineHeight: EMOJI_FONT_SIZE + 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
  },
  tabBar: {
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tabIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
});
