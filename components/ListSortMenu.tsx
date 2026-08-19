import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import type { ListSortMode } from '@/lib/listSort';

const BUTTON_SIZE = 36;
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
  { mode: 'custom', label: 'Custom order', icon: 'reorder' },
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

  const activeLabel =
    SORT_OPTIONS.find((option) => option.mode === sortMode)?.label ?? '';

  return (
    <View collapsable={false} style={styles.layoutSlot}>
      <View collapsable={false} style={[styles.root, visible && styles.rootOpen]}>
        <Pressable
          accessibilityHint={activeLabel ? `Currently ${activeLabel}` : undefined}
          accessibilityLabel="Sort lists"
          accessibilityRole="button"
          accessibilityState={{ expanded: visible }}
          hitSlop={8}
          onPress={toggleMenu}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: visible ? colors.surfaceMuted : colors.surface,
              borderColor: visible ? colors.accent : 'transparent',
              borderWidth: visible ? 1.5 : 0,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialIcons color={colors.accent} name="sort" size={20} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  layoutSlot: {
    flexShrink: 0,
    height: BUTTON_SIZE,
    overflow: 'visible',
    width: BUTTON_SIZE,
  },
  root: {
    height: BUTTON_SIZE,
    left: 0,
    overflow: 'visible',
    position: 'absolute',
    top: 0,
    width: BUTTON_SIZE,
  },
  rootOpen: {
    elevation: 24,
    width: MENU_MIN_WIDTH,
    zIndex: 1000,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: BUTTON_SIZE / 2,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    width: BUTTON_SIZE,
  },
  dropdown: {
    alignItems: 'flex-start',
    marginTop: MENU_ANCHOR_GAP,
    width: '100%',
  },
  menu: {
    borderWidth: 1,
    minWidth: MENU_MIN_WIDTH,
    width: '100%',
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: MENU_ITEM_GAP,
    minHeight: 44,
    paddingHorizontal: MENU_ITEM_HORIZONTAL_PADDING,
  },
});
