import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import type { ListSortMode } from '@/lib/listSort';

// The button has no background, so its box is sized to the icon itself —
// anything larger would read as extra gap after the title. hitSlop restores
// a comfortable touch target.
const ICON_SIZE = 24;
const BUTTON_SIZE = ICON_SIZE;
const MENU_ANCHOR_GAP = 8;
const MENU_MIN_WIDTH = 240;
const MENU_ITEM_ICON_SIZE = 20;
const MENU_ITEM_HORIZONTAL_PADDING = 14;
const MENU_ITEM_GAP = 10;

type SortOption = {
  mode: ListSortMode;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

const SORT_OPTIONS: SortOption[] = [
  { mode: 'alphabetical', label: 'Alphabetical', icon: 'sort-by-alpha' },
  { mode: 'recent', label: 'Recently updated', icon: 'schedule' },
  { mode: 'custom', label: 'Custom order', icon: 'swap-vert' },
];

const menuItemTextStyle = {
  flex: 1,
  fontFamily: 'NunitoSans_600SemiBold',
  fontSize: 16,
  lineHeight: 22,
  ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as object) : null),
};

type ListSortMenuProps = {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  sortMode: ListSortMode;
  onSortModeChange: (mode: ListSortMode) => void;
};

export default function ListSortMenu({
  visible,
  onVisibleChange,
  sortMode,
  onSortModeChange,
}: ListSortMenuProps) {
  const { colors, radii, spacing } = useTheme();

  const closeMenu = useCallback(() => {
    onVisibleChange(false);
  }, [onVisibleChange]);

  const toggleMenu = useCallback(() => {
    onVisibleChange(!visible);
  }, [onVisibleChange, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeMenu();
      return true;
    });

    return () => subscription.remove();
  }, [closeMenu, visible]);

  // The button wears the active mode's own icon, so the current sort is
  // readable without opening the menu.
  const activeOption =
    SORT_OPTIONS.find((option) => option.mode === sortMode) ?? SORT_OPTIONS[0];

  return (
    <View collapsable={false} style={[styles.root, visible && styles.rootOpen]}>
      <Pressable
        accessibilityHint={`Currently ${activeOption.label}`}
        accessibilityLabel="Sort lists"
        accessibilityRole="button"
        accessibilityState={{ expanded: visible }}
        hitSlop={12}
        onPress={toggleMenu}
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed || visible ? 0.7 : 1 },
        ]}
      >
        <MaterialIcons
          color={colors.accent}
          name={activeOption.icon}
          size={ICON_SIZE}
        />
      </Pressable>

      {visible ? (
        <View style={styles.dropdown}>
          <View
            style={[
              styles.menu,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                paddingVertical: spacing.xs,
                ...(Platform.OS === 'web'
                  ? { boxShadow: '0 8px 24px rgba(44, 36, 23, 0.18)' }
                  : {
                      elevation: 8,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.14,
                      shadowRadius: 10,
                    }),
              },
            ]}
          >
            {SORT_OPTIONS.map((option) => {
              const selected = option.mode === sortMode;

              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={option.mode}
                  onPress={() => {
                    closeMenu();
                    onSortModeChange(option.mode);
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <MaterialIcons
                    color={colors.text}
                    name={option.icon}
                    size={MENU_ITEM_ICON_SIZE}
                  />
                  <Text style={[menuItemTextStyle, { color: colors.text }]}>
                    {option.label}
                  </Text>
                  {selected ? (
                    <MaterialIcons
                      color={colors.accent}
                      name="check"
                      size={MENU_ITEM_ICON_SIZE}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The button takes part in the header's layout like any other item; only the
  // menu it opens is lifted out, so opening it never reflows the title.
  root: {
    flexShrink: 0,
    height: BUTTON_SIZE,
    overflow: 'visible',
    width: BUTTON_SIZE,
  },
  rootOpen: {
    elevation: 24,
    zIndex: 1000,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: BUTTON_SIZE,
    justifyContent: 'center',
    width: BUTTON_SIZE,
  },
  dropdown: {
    alignItems: 'flex-start',
    left: 0,
    marginTop: MENU_ANCHOR_GAP,
    minWidth: MENU_MIN_WIDTH,
    position: 'absolute',
    top: '100%',
  },
  menu: {
    borderWidth: 1,
    minWidth: MENU_MIN_WIDTH,
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: MENU_ITEM_GAP,
    minHeight: 44,
    paddingHorizontal: MENU_ITEM_HORIZONTAL_PADDING,
  },
});
