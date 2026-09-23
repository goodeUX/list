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

import { ToggleTrack } from '@/components/ToggleSwitch';
import { useTheme } from '@/contexts/ThemeContext';
import { radius, space } from '@/lib/design';

const MENU_ITEM_ICON_SIZE = 22;
const MENU_ITEM_HORIZONTAL_PADDING = space[4];
const MENU_ITEM_GAP = space[3];
const MENU_MIN_WIDTH = 320;
const BUTTON_SIZE = 44;
const MENU_ANCHOR_GAP = space[2];
const ICON_ROTATION_MS = 200;
const MENU_NATIVE_ID = 'list-options-menu';

const menuItemTextStyle = {
  flexShrink: 0,
  ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as object) : null),
};

type ListOptionsMenuProps = {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  showDeleteList: boolean;
  showLeaveList: boolean;
  moveDoneToBottom: boolean;
  onMoveDoneToBottomChange: (value: boolean) => void;
  onInvite: () => void;
  onClearList: () => void;
  onLeaveList: () => void;
  onDeleteList: () => void;
  onOpen?: () => void;
};

export default function ListOptionsMenu({
  visible,
  onVisibleChange,
  showDeleteList,
  showLeaveList,
  moveDoneToBottom,
  onMoveDoneToBottomChange,
  onInvite,
  onClearList,
  onLeaveList,
  onDeleteList,
  onOpen,
}: ListOptionsMenuProps) {
  const { colors, radius, space, typography, elevation } = useTheme();
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
              borderColor: visible ? colors.primary : 'transparent',
              borderWidth: visible ? 1.5 : 0,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Animated.View style={iconStyle}>
            <MaterialIcons color={colors.primary} name="more-horiz" size={22} />
          </Animated.View>
        </Pressable>

        {visible ? (
          <View style={styles.dropdown}>
            <View
              style={[
                styles.menu,
                elevation.e2,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  paddingVertical: space[1],
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
                <Text
                  style={[
                    typography.label,
                    menuItemTextStyle,
                    styles.menuItemLabel,
                    { color: colors.text },
                  ]}
                >
                  Move 'done' to bottom
                </Text>
                <ToggleTrack value={moveDoneToBottom} />
              </Pressable>

              <Pressable
                onPress={() => {
                  closeMenu();
                  onInvite();
                }}
                style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons color={colors.text} name="person-add" size={MENU_ITEM_ICON_SIZE} />
                <Text style={[typography.label, menuItemTextStyle, { color: colors.text }]}>
                  Invite someone
                </Text>
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
                <Text style={[typography.label, menuItemTextStyle, { color: colors.text }]}>
                  Clear list
                </Text>
              </Pressable>

              {showLeaveList ? (
                <Pressable
                  onPress={() => {
                    closeMenu();
                    onLeaveList();
                  }}
                  style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialIcons
                    color={colors.danger}
                    name="logout"
                    size={MENU_ITEM_ICON_SIZE}
                  />
                  <Text style={[typography.label, menuItemTextStyle, { color: colors.danger }]}>
                    Leave list
                  </Text>
                </Pressable>
              ) : null}

              {showDeleteList ? (
                <Pressable
                  onPress={() => {
                    closeMenu();
                    onDeleteList();
                  }}
                  style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialIcons
                    color={colors.danger}
                    name="delete-outline"
                    size={MENU_ITEM_ICON_SIZE}
                  />
                  <Text style={[typography.label, menuItemTextStyle, { color: colors.danger }]}>
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
    borderRadius: radius.xl,
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
});
