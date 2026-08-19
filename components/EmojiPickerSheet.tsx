import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// Used only until a native keyboard has been measured; after that the sheet
// matches the keyboard's height exactly.
const FALLBACK_VISIBLE_ROWS = 6;
// Close to the real measured value, so the first open doesn't visibly resize.
const ESTIMATED_CHROME_HEIGHT = 72;
// Corner of the highlight behind the selected category icon.
const CATEGORY_ACTIVE_RADIUS = 8;
// Never collapse the grid to nothing on a very short keyboard.
const MIN_VISIBLE_ROWS = 2;
const HEADER_HEIGHT = 34;
const MIN_CELL_SIZE = 44;
const TAB_BAR_HEIGHT = 52;
const EMOJI_FONT_SIZE = 26;
// Shared by the search row, the emoji grid and the category row, so all three
// sections line up against the same inset.
const CONTENT_HORIZONTAL_PADDING = 12;

const OPEN_DURATION_MS = 220;
const CLOSE_DURATION_MS = 180;
// Start far enough down to be off screen before the sheet has been measured.
const OFFSCREEN_FALLBACK = 1000;

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
  /** Height of the native keyboard in dp; the sheet matches it. 0 if unknown. */
  keyboardHeight?: number;
};

export default function EmojiPickerSheet({
  visible,
  onClose,
  onSelect,
  selected,
  keyboardHeight = 0,
}: EmojiPickerSheetProps) {
  const { colors, radii } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const listRef = useRef<FlatList<EmojiRow>>(null);
  // Set while a tab tap is scrolling, so the scroll handler doesn't fight it.
  const pendingCategoryRef = useRef<number | null>(null);
  // Stays mounted through the closing slide, then unmounts.
  const [mounted, setMounted] = useState(visible);
  const sheetHeightRef = useRef(0);
  const translateY = useSharedValue(OFFSCREEN_FALLBACK);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleSheetLayout = useCallback((event: LayoutChangeEvent) => {
    sheetHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  // Cells are sized against the padded width, not the window, so the last
  // column lands flush with the inset instead of overflowing past it.
  const gridWidth = windowWidth - CONTENT_HORIZONTAL_PADDING * 2;
  const columns = Math.max(6, Math.floor(gridWidth / MIN_CELL_SIZE));
  const cellSize = gridWidth / columns;

  // Knob + search row, measured so the list can take exactly the space left over.
  const [chromeHeight, setChromeHeight] = useState(ESTIMATED_CHROME_HEIGHT);
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  const handleChromeLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    setChromeHeight((current) => (current === next ? current : next));
  }, []);

  // Android reports the keyboard height as the resized window area, which stops
  // above the navigation bar. This sheet draws to the screen edge, so it has to
  // cover that strip too or it lands short of where the keyboard was. iOS already
  // includes the home indicator in its reported height.
  const targetSheetHeight =
    keyboardHeight > 0
      ? keyboardHeight + (Platform.OS === 'android' ? insets.bottom : 0)
      : 0;

  const listHeight =
    targetSheetHeight > 0
      ? Math.max(
          MIN_VISIBLE_ROWS * cellSize,
          targetSheetHeight - chromeHeight - tabBarHeight,
        )
      : FALLBACK_VISIBLE_ROWS * cellSize;

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
      onSelect(emoji.emoji);
    },
    [onSelect],
  );

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    setQuery('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (visible) {
      translateY.value = withTiming(0, { duration: OPEN_DURATION_MS });
      return;
    }

    translateY.value = withTiming(
      sheetHeightRef.current || OFFSCREEN_FALLBACK,
      { duration: CLOSE_DURATION_MS },
      (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      },
    );
  }, [mounted, translateY, visible]);

  // Without a Modal wrapper there is no onRequestClose, so back must be handled here
  // or it would dismiss the whole list modal instead of just this sheet.
  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });

    return () => subscription.remove();
  }, [handleClose, visible]);

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

  if (!mounted) {
    return null;
  }

  return (
    // box-none lets taps outside the sheet reach the fields and buttons beneath,
    // so tapping the name input focuses it in one go rather than only closing this.
    <View pointerEvents="box-none" style={styles.layer}>
      <Animated.View
        onLayout={handleSheetLayout}
        style={[styles.sheet, sheetAnimatedStyle, { backgroundColor: colors.surface }]}
      >
        <View onLayout={handleChromeLayout}>
        <View
          style={[styles.searchRow, { borderBottomColor: colors.border }]}
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
        </View>

        {searching && rows.length === 0 ? (
          <View style={[styles.emptyState, { height: listHeight }]}>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No emoji found
            </Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
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
              height: TAB_BAR_HEIGHT + insets.bottom,
              paddingBottom: insets.bottom,
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    // Above the list modal shell (zIndex 100) it sits over.
    zIndex: 101,
  },
  sheet: {
    overflow: 'hidden',
    width: '100%',
  },
  searchRow: {
    // Matches the tab bar's top border so both dividers read the same weight.
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
    paddingHorizontal: CONTENT_HORIZONTAL_PADDING,
    paddingTop: 16,
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
  listContent: {
    paddingHorizontal: CONTENT_HORIZONTAL_PADDING,
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
    paddingHorizontal: CONTENT_HORIZONTAL_PADDING,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tabIcon: {
    alignItems: 'center',
    borderRadius: CATEGORY_ACTIVE_RADIUS,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
});
