import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/lib/theme';

const DESTRUCTIVE_COLOR = '#D64545';
const MENU_ITEM_ICON_SIZE = 22;
const MENU_ITEM_REM = 16;
const MENU_ITEM_HORIZONTAL_PADDING = 14;
const MENU_ITEM_GAP = 10;
const MENU_MIN_WIDTH = 320;
const BUTTON_SIZE = 44;
const MENU_ANCHOR_GAP = 8;
const ICON_ROTATION_MS = 200;
const MENU_NATIVE_ID = 'list-options-menu';
const TOGGLE_WIDTH = 40;
const TOGGLE_HEIGHT = 24;
const TOGGLE_THUMB_SIZE = 20;
const TOGGLE_THUMB_TRAVEL = TOGGLE_WIDTH - TOGGLE_THUMB_SIZE - 4;

const menuItemTextStyle = {
  flexShrink: 0,
  fontFamily: 'NunitoSans_600SemiBold',
  fontSize: MENU_ITEM_REM,
  lineHeight: 22,
  ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as object) : null),
};

type ListOptionsMenuProps = {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  showDeleteList: boolean;
  moveDoneToBottom: boolean;
  onMoveDoneToBottomChange: (value: boolean) => void;
  onInvite: () => void;
  onClearList: () => void;
  onDeleteList: () => void;
  onOpen?: () => void;
};

function MenuToggle({ colors, value }: { colors: ThemeColors; value: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.toggleTrack,
        { backgroundColor: value ? colors.accentSoft : colors.border },
      ]}
    >
      <View
        style={[
          styles.toggleThumb,
          {
            backgroundColor: value ? colors.accent : colors.surface,
            transform: [{ translateX: value ? TOGGLE_THUMB_TRAVEL : 0 }],
          },
        ]}
      />
    </View>
  );
}

export default function ListOptionsMenu({
  visible,
  onVisibleChange,
  showDeleteList,
  moveDoneToBottom,
  onMoveDoneToBottomChange,
  onInvite,
  onClearList,
  onDeleteList,
  onOpen,
}: ListOptionsMenuProps) {
  const { colors, radii, spacing } = useTheme();
  const iconRotation = useSharedValue(0);

  const closeMenu = useCallback(() => {
    onVisibleChange(false);
  }, [onVisibleChange]);

  const openMenu = useCallback(() => {
    onOpen?.();
    onVisibleChange(true);
  }, [onOpen, onVisibleChange]);

  const toggleMenu = useCallback(() => {
    if (visible) {
      closeMenu();
      return;
    }

    openMenu();
  }, [closeMenu, openMenu, visible]);

  const toggleMoveDoneToBottom = useCallback(() => {
    onMoveDoneToBottomChange(!moveDoneToBottom);
  }, [moveDoneToBottom, onMoveDoneToBottomChange]);

  useEffect(() => {
    iconRotation.value = withTiming(visible ? 90 : 0, {
      duration: ICON_ROTATION_MS,
      easing: Easing.inOut(Easing.ease),
    });
  }, [iconRotation, visible]);

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

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const menuAnchor = document.getElementById(MENU_NATIVE_ID);
      if (menuAnchor?.contains(event.target as Node)) {
        return;
      }

      closeMenu();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [closeMenu, visible]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  return (
    <View collapsable={false} nativeID={MENU_NATIVE_ID} style={styles.layoutSlot}>
      <View
        collapsable={false}
        style={[styles.root, visible && styles.rootOpen]}
      >
        <Pressable
          accessibilityLabel="List options"
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
          <Animated.View style={iconStyle}>
            <MaterialIcons color={colors.accent} name="more-horiz" size={22} />
          </Animated.View>
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
              <Pressable
                accessibilityLabel="Move 'done' to bottom"
                accessibilityRole="switch"
                accessibilityState={{ checked: moveDoneToBottom }}
                onPress={toggleMoveDoneToBottom}
                style={({ pressed }) => [
                  styles.menuItem,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <MaterialIcons color={colors.text} name="move-down" size={MENU_ITEM_ICON_SIZE} />
                <Text style={[menuItemTextStyle, styles.menuItemLabel, { color: colors.text }]}>
                  Move 'done' to bottom
                </Text>
                <MenuToggle colors={colors} value={moveDoneToBottom} />
              </Pressable>

              <Pressable
                onPress={() => {
                  closeMenu();
                  onInvite();
                }}
                style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons color={colors.text} name="person-add" size={MENU_ITEM_ICON_SIZE} />
                <Text style={[menuItemTextStyle, { color: colors.text }]}>Invite someone</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  closeMenu();
                  onClearList();
                }}
                style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons
                  color={colors.text}
                  name="playlist-remove"
                  size={MENU_ITEM_ICON_SIZE}
                />
                <Text style={[menuItemTextStyle, { color: colors.text }]}>Clear list</Text>
              </Pressable>

              {showDeleteList ? (
                <Pressable
                  onPress={() => {
                    closeMenu();
                    onDeleteList();
                  }}
                  style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialIcons
                    color={DESTRUCTIVE_COLOR}
                    name="delete-outline"
                    size={MENU_ITEM_ICON_SIZE}
                  />
                  <Text style={[menuItemTextStyle, { color: DESTRUCTIVE_COLOR }]}>
                    Delete list
                  </Text>
                </Pressable>
              ) : null}
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
    overflow: 'visible',
    position: 'absolute',
    right: 0,
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
    alignSelf: 'flex-end',
    borderRadius: 22,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    width: BUTTON_SIZE,
  },
  dropdown: {
    alignItems: 'flex-end',
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
  menuItemLabel: {
    flex: 1,
  },
  toggleTrack: {
    borderRadius: TOGGLE_HEIGHT / 2,
    height: TOGGLE_HEIGHT,
    justifyContent: 'center',
    padding: 2,
    width: TOGGLE_WIDTH,
  },
  toggleThumb: {
    borderRadius: TOGGLE_THUMB_SIZE / 2,
    height: TOGGLE_THUMB_SIZE,
    width: TOGGLE_THUMB_SIZE,
  },
});
