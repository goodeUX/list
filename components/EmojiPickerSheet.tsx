import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type TextInput,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { absoluteFill } from '@/lib/absoluteFill';
import Animated, {
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ThemedTextInput from '@/components/ThemedTextInput';
import { useTheme } from '@/contexts/ThemeContext';
import { radius, space } from '@/lib/design';
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
const CATEGORY_ACTIVE_RADIUS = radius.sm;
// Never collapse the grid to nothing on a very short keyboard.
const MIN_VISIBLE_ROWS = 2;
const HEADER_HEIGHT = 34;
const MIN_CELL_SIZE = 44;
const TAB_BAR_HEIGHT = 52;
const EMOJI_FONT_SIZE = 26;
// Shared by the search row, the emoji grid and the category row, so all three
// sections line up against the same inset.
const CONTENT_HORIZONTAL_PADDING = space[3];

// Space kept between the first visible emoji row and the keyboard.
const KEYBOARD_GAP = space[2];

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

/**
 * Closes the sheet when a touch starts anywhere outside it, while still
 * letting that touch through (so, e.g., tapping a field focuses it in one go).
 *
 * The sheet renders as a sibling of the screen's content, so attach
 * `onContentTouchStart` to the container around that content: every touch not
 * on the sheet reaches it. Attach `onToggleTouchStart` around the button that
 * opens the sheet, so its own tap toggles rather than closing and reopening.
 */
export function useEmojiSheetDismissal(open: boolean, close: () => void) {
  const toggleTouchRef = useRef(false);

  const onToggleTouchStart = useCallback(() => {
    toggleTouchRef.current = true;
  }, []);

  const onContentTouchStart = useCallback(() => {
    if (toggleTouchRef.current) {
      toggleTouchRef.current = false;
      return;
    }
    if (open) {
      close();
    }
  }, [close, open]);

  return { onContentTouchStart, onToggleTouchStart };
}

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
  const { colors, radius, typography, elevation } = useTheme();
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

  // While the search field has the keyboard up, the grid grows with the
  // keyboard frame by frame — the same tracking that pushes fields up on the
  // edit item page — so the search field and the first row of emojis stay
  // just above it. The translucent flags keep useAnimatedKeyboard from
  // turning the Android system bars opaque.
  const keyboard = useAnimatedKeyboard({
    isNavigationBarTranslucentAndroid: true,
    isStatusBarTranslucentAndroid: true,
  });
  // The top of the grid to keep visible: a category heading and its first
  // row (search results have no headings).
  const revealHeight = (searching ? 0 : HEADER_HEIGHT) + cellSize + KEYBOARD_GAP;
  const listAnimatedStyle = useAnimatedStyle(() => {
    // The keyboard covers the tab bar first, then the bottom of the grid.
    const covered = keyboard.height.value - tabBarHeight;
    const growth = Math.max(0, covered - (listHeight - revealHeight));
    return { height: listHeight + growth };
  });

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

  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    // However the sheet was closed, don't leave its search keyboard up or a
    // stale search for next time.
    if (searchInputRef.current?.isFocused()) {
      searchInputRef.current.blur();
    }
    setQuery('');
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
            <Text style={[typography.bodyS, styles.sectionHeaderText, { color: colors.textSecondary }]}>
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
                  borderRadius: radius.sm,
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
      radius.sm,
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
        style={[
          styles.sheet,
          sheetAnimatedStyle,
          elevation.e3,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
          },
        ]}
      >
        <View onLayout={handleChromeLayout}>
        <View
          style={[styles.searchRow, { borderBottomColor: colors.border }]}
        >
          {/* The app's standard text field, with a clear button over its end. */}
          <View style={styles.searchField}>
            <ThemedTextInput
              ref={searchInputRef}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder="Search"
              style={styles.searchInput}
              value={query}
            />
            {query ? (
              <Pressable
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setQuery('')}
                style={styles.searchClear}
              >
                <Ionicons color={colors.textSecondary} name="close-circle" size={18} />
              </Pressable>
            ) : null}
          </View>
        </View>
        </View>

        <Animated.View style={listAnimatedStyle}>
        {searching && rows.length === 0 ? (
          <View style={[styles.emptyState, styles.listFill]}>
            <Text style={[typography.body, styles.emptyStateText, { color: colors.textSecondary }]}>
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
            style={styles.listFill}
            windowSize={RENDER_WINDOW}
          />
        )}
        </Animated.View>

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
                    color={isActive ? colors.primary : colors.textSecondary}
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
    ...absoluteFill,
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
    paddingBottom: space[4],
    paddingHorizontal: CONTENT_HORIZONTAL_PADDING,
    paddingTop: space[4],
  },
  searchField: {
    justifyContent: 'center',
  },
  searchInput: {
    // Keeps typed text clear of the clear button.
    paddingRight: space[4] + 18 + space[2],
  },
  searchClear: {
    position: 'absolute',
    right: space[4],
  },
  sectionHeader: {
    justifyContent: 'center',
    paddingHorizontal: space[3],
  },
  sectionHeaderText: {},
  listFill: {
    flex: 1,
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
  emptyStateText: {},
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
